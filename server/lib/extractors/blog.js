const { JSDOM } = require('jsdom');
const { Readability } = require('@mozilla/readability');
const { assertSafeUrl } = require('../urlSafety');

const FETCH_TIMEOUT_MS = 10000;
const MAX_HTML_BYTES = 3 * 1024 * 1024; // 3MB, generous for an article page

/**
 * Extracts the main article text from a blog or news URL.
 * @param {string} url
 * @returns {Promise<{title: string, text: string}>}
 */
async function extractBlog(url) {
  await assertSafeUrl(url);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let html;
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'LearnLoopBot/1.0 (+educational tool)' },
    });

    if (!response.ok) {
      throw new Error(`The page responded with status ${response.status}.`);
    }

    const contentLength = Number(response.headers.get('content-length') || 0);
    if (contentLength > MAX_HTML_BYTES) {
      throw new Error('That page is too large to process.');
    }

    html = await response.text();
    if (html.length > MAX_HTML_BYTES) {
      html = html.slice(0, MAX_HTML_BYTES);
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('That page took too long to respond.');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }

  const dom = new JSDOM(html, { url });
  const article = new Readability(dom.window.document).parse();

  if (!article || !article.textContent || article.textContent.trim().length < 50) {
    throw new Error('Could not find readable article content on that page.');
  }

  return { title: article.title || 'Untitled article', text: article.textContent.trim() };
}

module.exports = { extractBlog };
