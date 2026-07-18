const express = require('express');
const { validateChatRequest } = require('../lib/validate');
const { buildChatSystemInstruction } = require('../lib/promptTemplates');
const { generateChatReply } = require('../lib/aiClient');
const { getSession, appendChatTurn } = require('../lib/sessionStore');

const router = express.Router();

router.post('/chat', async (req, res, next) => {
  const { valid, errors } = validateChatRequest(req.body);
  if (!valid) {
    return res.status(400).json({ error: 'Invalid request.', details: errors });
  }

  const { sessionId, question } = req.body;
  const session = getSession(sessionId);

  if (!session) {
    return res.status(404).json({ error: 'Session not found or expired. Please ingest your source again.' });
  }

  try {
    const systemInstruction = buildChatSystemInstruction(session.text);
    const trimmedQuestion = question.trim();
    const historySnapshot = [...session.chatHistory];
    const answer = await generateChatReply(systemInstruction, historySnapshot, trimmedQuestion);

    appendChatTurn(sessionId, 'user', trimmedQuestion);
    appendChatTurn(sessionId, 'model', answer);

    return res.status(200).json({ answer });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
