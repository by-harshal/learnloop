const express = require('express');
const { validateGenerateRequest } = require('../lib/validate');
const { buildFeaturePrompt } = require('../lib/promptTemplates');
const { generateStructuredJson } = require('../lib/aiClient');
const { getSession } = require('../lib/sessionStore');

const router = express.Router();

router.post('/generate', async (req, res, next) => {
  const { valid, errors } = validateGenerateRequest(req.body);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid request.', details: errors });
  }

  const { sessionId, feature } = req.body;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired. Please ingest your source again.' });
  }

  try {
    const { systemInstruction, userContent } = buildFeaturePrompt(feature, session.text);
    const result = await generateStructuredJson(systemInstruction, userContent);
    return res.status(200).json({ feature, result });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
