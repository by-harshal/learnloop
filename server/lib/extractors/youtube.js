const { YoutubeTranscript } = require('youtube-transcript');
const { assertSafeUrl } = require('../urlSafety');

const YOUTUBE_HOSTNAMES = new Set(['www.youtube.com', 'youtube.com', 'youtu.be', 'm.youtube.com']);

/**
 * Extracts the transcript text from a YouTube video URL.
 * @param {string} url
 * @returns {Promise<{title: string, text: string}>}
 */
async function extractYoutube(url) {
  const parsed = await assertSafeUrl(url);

  if (!YOUTUBE_HOSTNAMES.has(parsed.hostname.toLowerCase())) {
    throw new Error('That does not look like a YouTube URL.');
  }

  let segments;
  try {
    segments = await YoutubeTranscript.fetchTranscript(url);
  } catch {
    throw new Error(
      'Could not fetch a transcript for that video. It may have captions disabled or be private.'
    );
  }

  if (!segments || segments.length === 0) {
    throw new Error('That video has no transcript available.');
  }

  const text = segments.map((segment) => segment.text).join(' ');
  return { title: 'YouTube video', text };
}

module.exports = { extractYoutube };
