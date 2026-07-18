const { assertSafeUrl } = require('../urlSafety');

const FETCH_TIMEOUT_MS = 10000;
const SHEET_ID_PATTERN = /\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/;

function extractSheetId(url) {
  const match = url.match(SHEET_ID_PATTERN);
  if (!match) {
    throw new Error('That does not look like a Google Sheets URL.');
  }
  return match[1];
}

/**
 * Turns simple CSV text into a plain-language row-by-row description, which reads
 * far better to a language model than raw comma-separated values.
 */
function csvToReadableText(csv) {
  const rows = csv
    .split('\n')
    .map((row) => row.trim())
    .filter(Boolean)
    .map((row) => row.split(','));

  if (rows.length === 0) return '';

  const [header, ...dataRows] = rows;
  return dataRows
    .map((row) => header.map((col, i) => `${col.trim()}: ${(row[i] || '').trim()}`).join(', '))
    .join('\n');
}

/**
 * Extracts the content of the first sheet of a publicly viewable Google Sheet
 * using its CSV export endpoint. The sheet must be shared as "Anyone with the
 * link can view", since this uses no OAuth.
 * @param {string} url
 * @returns {Promise<{title: string, text: string}>}
 */
async function extractGoogleSheet(url) {
  await assertSafeUrl(url);
  const sheetId = extractSheetId(url);
  const exportUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let csv;
  try {
    const response = await fetch(exportUrl, { signal: controller.signal });
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'That Google Sheet is not public. Share it as "Anyone with the link can view" and try again.'
      );
    }
    if (!response.ok) {
      throw new Error(`Could not read that Google Sheet (status ${response.status}).`);
    }
    csv = await response.text();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Google Sheets took too long to respond.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!csv || csv.includes('accounts.google.com')) {
    throw new Error(
      'Could not read that Google Sheet. Make sure it is shared as "Anyone with the link can view".'
    );
  }

  const text = csvToReadableText(csv);
  if (text.trim().length < 10) {
    throw new Error('That sheet appears to be empty.');
  }

  return { title: 'Google Sheet (first tab)', text };
}

module.exports = { extractGoogleSheet, csvToReadableText };
