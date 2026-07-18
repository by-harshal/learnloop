const { PDFParse } = require('pdf-parse');

/**
 * Extracts text from an uploaded PDF file buffer.
 * @param {Buffer} buffer
 * @param {string} [originalName]
 * @returns {Promise<{title: string, text: string}>}
 */
async function extractPdf(buffer, originalName) {
  let text;
  try {
    const parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    text = (result.text || '').trim();
  } catch {
    throw new Error('Could not read that PDF. It may be corrupted or scanned as images only.');
  }

  if (text.length < 20) {
    throw new Error(
      'Could not extract readable text from that PDF. Scanned image-only PDFs are not supported yet.'
    );
  }

  return { title: originalName || 'Uploaded PDF', text };
}

module.exports = { extractPdf };
