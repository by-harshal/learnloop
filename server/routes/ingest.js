const express = require('express');
const multer = require('multer');
const { validateIngestUrlRequest } = require('../lib/validate');
const { extractSource } = require('../lib/extractors');
const { createSession } = require('../lib/sessionStore');

const router = express.Router();

const MAX_PDF_BYTES = 10 * 1024 * 1024; // 10MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_PDF_BYTES },
  fileFilter: (req, file, cb) => {
    if (file.mimetype !== 'application/pdf') {
      return cb(new Error('Only PDF files are accepted.'));
    }
    cb(null, true);
  },
});

function summariseAndRespond(res, sourceType, title, text) {
  const sessionId = createSession({ title, text, sourceType });
  return res.status(200).json({
    sessionId,
    title,
    wordCount: text.split(/\s+/).filter(Boolean).length,
    textPreview: text.slice(0, 300),
  });
}

router.post('/ingest/url', async (req, res) => {
  const { valid, errors } = validateIngestUrlRequest(req.body);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid request.', details: errors });
  }

  const { sourceType, url } = req.body;

  try {
    const { title, text } = await extractSource({ sourceType, url });
    return summariseAndRespond(res, sourceType, title, text);
  } catch (err) {
    // Extraction failures (bad URL, private doc, no transcript) are the user's to fix,
    // not a server fault, so respond 400 with the specific, safe message from the extractor.
    return res.status(400).json({ error: err.message });
  }
});

router.post('/ingest/pdf', (req, res) => {
  upload.single('file')(req, res, async (uploadErr) => {
    if (uploadErr) {
      return res.status(400).json({ error: uploadErr.message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No PDF file was uploaded.' });
    }

    try {
      const { title, text } = await extractSource({
        sourceType: 'pdf',
        fileBuffer: req.file.buffer,
        fileName: req.file.originalname,
      });
      return summariseAndRespond(res, 'pdf', title, text);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  });
});

module.exports = router;
