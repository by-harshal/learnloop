// Shared input validation. Every route validates the same way, using the same
// constants, so limits cannot drift between routes (Code Quality, Security).

const { VALID_FEATURES } = require('./promptTemplates');

const URL_SOURCE_TYPES = ['youtube', 'blog', 'gdoc', 'gsheet'];
const MAX_URL_LENGTH = 2000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MIN_QUESTION_LENGTH = 3;
const MAX_QUESTION_LENGTH = 2000;

function validateIngestUrlRequest(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  const { sourceType, url } = body;

  if (typeof sourceType !== 'string' || !URL_SOURCE_TYPES.includes(sourceType)) {
    errors.push(`sourceType must be one of: ${URL_SOURCE_TYPES.join(', ')}.`);
  }

  if (typeof url !== 'string' || url.trim().length === 0) {
    errors.push('url must be a non-empty string.');
  } else if (url.length > MAX_URL_LENGTH) {
    errors.push(`url must be under ${MAX_URL_LENGTH} characters.`);
  }

  return { valid: errors.length === 0, errors };
}

function validateSessionId(sessionId) {
  return typeof sessionId === 'string' && UUID_PATTERN.test(sessionId);
}

function validateGenerateRequest(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  const { sessionId, feature } = body;

  if (!validateSessionId(sessionId)) {
    errors.push('sessionId must be a valid session id. Ingest a source first.');
  }

  if (typeof feature !== 'string' || !VALID_FEATURES.includes(feature)) {
    errors.push(`feature must be one of: ${VALID_FEATURES.join(', ')}.`);
  }

  return { valid: errors.length === 0, errors };
}

function validateChatRequest(body) {
  const errors = [];

  if (!body || typeof body !== 'object') {
    return { valid: false, errors: ['Request body must be a JSON object.'] };
  }

  const { sessionId, question } = body;

  if (!validateSessionId(sessionId)) {
    errors.push('sessionId must be a valid session id. Ingest a source first.');
  }

  if (typeof question !== 'string') {
    errors.push('question must be a string.');
  } else {
    const trimmed = question.trim();
    if (trimmed.length < MIN_QUESTION_LENGTH) {
      errors.push(`question must be at least ${MIN_QUESTION_LENGTH} characters.`);
    }
    if (trimmed.length > MAX_QUESTION_LENGTH) {
      errors.push(`question must be under ${MAX_QUESTION_LENGTH} characters.`);
    }
  }

  return { valid: errors.length === 0, errors };
}

module.exports = {
  validateIngestUrlRequest,
  validateGenerateRequest,
  validateChatRequest,
  validateSessionId,
  URL_SOURCE_TYPES,
  MAX_URL_LENGTH,
  MIN_QUESTION_LENGTH,
  MAX_QUESTION_LENGTH,
};
