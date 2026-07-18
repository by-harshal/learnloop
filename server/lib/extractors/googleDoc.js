const { assertSafeUrl } = require('../urlSafety');

const FETCH_TIMEOUT_MS = 10000;
const DOC_ID_PATTERN = /\/document\/d\/([a-zA-Z0-9_-]+)/;

function extractDocId(url) {
  const match = url.match(DOC_ID_PATTERN);
  if (!match) {
    throw new Error('That does not look like a Google Docs URL.');
  }
  return match[1];
}

/**
 * Extracts the text of a publicly viewable Google Doc using its plain-text export endpoint.
 * The doc must be shared as "Anyone with the link can view", since this uses no OAuth.
 * @param {string} url
 * @returns {Promise<{title: string, text: string}>}
 */
async function extractGoogleDoc(url) {
  await assertSafeUrl(url);
  const docId = extractDocId(url);
  const exportUrl = `https://docs.google.com/document/d/${docId}/export?format=txt`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let text;
  try {
    const response = await fetch(exportUrl, { signal: controller.signal });
    if (response.status === 401 || response.status === 403) {
      throw new Error(
        'That Google Doc is not public. Share it as "Anyone with the link can view" and try again.'
      );
    }
    if (!response.ok) {
      throw new Error(`Could not read that Google Doc (status ${response.status}).`);
    }
    text = await response.text();
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Google Docs took too long to respond.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  if (!text || text.trim().length < 10 || text.includes('accounts.google.com')) {
    throw new Error(
      'Could not read that Google Doc. Make sure it is shared as "Anyone with the link can view".'
    );
  }

  return { title: 'Google Doc', text: text.trim() };
}

module.exports = { extractGoogleDoc };
