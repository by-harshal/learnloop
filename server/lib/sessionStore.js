// Holds ingested source text and chat history in memory, keyed by sessionId.
// This is a single-instance in-memory store, which is a fine trade-off for a
// hackathon demo: no database to set up or secure, at the cost of state being
// lost on server restart and not shared across multiple instances. See README.

const crypto = require('crypto');

const SESSION_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours
const SWEEP_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CHAT_HISTORY_TURNS = 8;

const sessions = new Map();

function createSession({ title, text, sourceType }) {
  const sessionId = crypto.randomUUID();
  sessions.set(sessionId, {
    title,
    text,
    sourceType,
    chatHistory: [],
    createdAt: Date.now(),
  });
  return sessionId;
}

function getSession(sessionId) {
  return sessions.get(sessionId) || null;
}

function appendChatTurn(sessionId, role, text) {
  const session = sessions.get(sessionId);
  if (!session) return;
  session.chatHistory.push({ role, text });
  if (session.chatHistory.length > MAX_CHAT_HISTORY_TURNS) {
    session.chatHistory = session.chatHistory.slice(-MAX_CHAT_HISTORY_TURNS);
  }
}

function sweepExpiredSessions() {
  const now = Date.now();
  for (const [sessionId, session] of sessions.entries()) {
    if (now - session.createdAt > SESSION_TTL_MS) {
      sessions.delete(sessionId);
    }
  }
}

function startSweeper() {
  const timer = setInterval(sweepExpiredSessions, SWEEP_INTERVAL_MS);
  timer.unref(); // never keep the process alive just for this
  return timer;
}

function clearAllSessions() {
  sessions.clear();
}

module.exports = {
  createSession,
  getSession,
  appendChatTurn,
  sweepExpiredSessions,
  startSweeper,
  clearAllSessions,
  MAX_CHAT_HISTORY_TURNS,
};
