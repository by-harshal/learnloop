const { extractYoutube } = require('./youtube');
const { extractBlog } = require('./blog');
const { extractGoogleDoc } = require('./googleDoc');
const { extractGoogleSheet } = require('./googleSheet');
const { extractPdf } = require('./pdf');

// Caps how much text ever reaches the model. Keeps cost and latency predictable
// regardless of how long a source is (Efficiency), and keeps requests to the
// model bounded (Security).
const MAX_SOURCE_CHARS = 15000;

function normaliseAndCap(text) {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  return collapsed.length > MAX_SOURCE_CHARS ? collapsed.slice(0, MAX_SOURCE_CHARS) : collapsed;
}

/**
 * Extracts { title, text } from a source, dispatching on sourceType.
 * @param {object} params
 * @param {string} params.sourceType - one of 'youtube', 'blog', 'gdoc', 'gsheet', 'pdf'
 * @param {string} [params.url] - required for youtube, blog, gdoc, gsheet
 * @param {Buffer} [params.fileBuffer] - required for pdf
 * @param {string} [params.fileName] - original PDF file name
 */
async function extractSource({ sourceType, url, fileBuffer, fileName }) {
  let result;

  switch (sourceType) {
    case 'youtube':
      result = await extractYoutube(url);
      break;
    case 'blog':
      result = await extractBlog(url);
      break;
    case 'gdoc':
      result = await extractGoogleDoc(url);
      break;
    case 'gsheet':
      result = await extractGoogleSheet(url);
      break;
    case 'pdf':
      result = await extractPdf(fileBuffer, fileName);
      break;
    default:
      throw new Error(`Unknown source type: ${sourceType}`);
  }

  return { title: result.title, text: normaliseAndCap(result.text) };
}

module.exports = { extractSource, MAX_SOURCE_CHARS };
