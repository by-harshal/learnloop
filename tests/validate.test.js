const {
  validateIngestUrlRequest,
  validateGenerateRequest,
  validateChatRequest,
  validateSessionId,
} = require('../server/lib/validate');

const VALID_SESSION_ID = '123e4567-e89b-12d3-a456-426614174000';

describe('validateIngestUrlRequest', () => {
  test('accepts a valid youtube request', () => {
    const result = validateIngestUrlRequest({ sourceType: 'youtube', url: 'https://youtu.be/abc123' });
    expect(result.valid).toBe(true);
  });

  test('accepts a valid blog request', () => {
    const result = validateIngestUrlRequest({ sourceType: 'blog', url: 'https://example.com/post' });
    expect(result.valid).toBe(true);
  });

  test('rejects a missing body', () => {
    expect(validateIngestUrlRequest(undefined).valid).toBe(false);
  });

  test('rejects an unknown sourceType', () => {
    const result = validateIngestUrlRequest({ sourceType: 'pdf', url: 'https://example.com/x' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('sourceType must be one of'))).toBe(true);
  });

  test('rejects a missing url', () => {
    const result = validateIngestUrlRequest({ sourceType: 'blog' });
    expect(result.valid).toBe(false);
  });

  test('rejects an empty url', () => {
    const result = validateIngestUrlRequest({ sourceType: 'blog', url: '   ' });
    expect(result.valid).toBe(false);
  });

  test('rejects an oversized url', () => {
    const result = validateIngestUrlRequest({
      sourceType: 'blog',
      url: `https://example.com/${'a'.repeat(2100)}`,
    });
    expect(result.valid).toBe(false);
  });
});

describe('validateSessionId', () => {
  test('accepts a valid uuid', () => {
    expect(validateSessionId(VALID_SESSION_ID)).toBe(true);
  });

  test('rejects a non-uuid string', () => {
    expect(validateSessionId('not-a-uuid')).toBe(false);
  });

  test('rejects a non-string', () => {
    expect(validateSessionId(12345)).toBe(false);
  });
});

describe('validateGenerateRequest', () => {
  test('accepts a valid request', () => {
    const result = validateGenerateRequest({ sessionId: VALID_SESSION_ID, feature: 'summary' });
    expect(result.valid).toBe(true);
  });

  test('rejects an invalid sessionId', () => {
    const result = validateGenerateRequest({ sessionId: 'bad-id', feature: 'summary' });
    expect(result.valid).toBe(false);
  });

  test('rejects an unknown feature', () => {
    const result = validateGenerateRequest({ sessionId: VALID_SESSION_ID, feature: 'essay' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('feature must be one of'))).toBe(true);
  });
});

describe('validateChatRequest', () => {
  test('accepts a valid request', () => {
    const result = validateChatRequest({ sessionId: VALID_SESSION_ID, question: 'What is the main idea?' });
    expect(result.valid).toBe(true);
  });

  test('rejects a question that is too short', () => {
    const result = validateChatRequest({ sessionId: VALID_SESSION_ID, question: 'hi' });
    expect(result.valid).toBe(false);
  });

  test('rejects a question that is too long', () => {
    const result = validateChatRequest({ sessionId: VALID_SESSION_ID, question: 'a'.repeat(2001) });
    expect(result.valid).toBe(false);
  });

  test('rejects a non-string question', () => {
    const result = validateChatRequest({ sessionId: VALID_SESSION_ID, question: 42 });
    expect(result.valid).toBe(false);
  });

  test('rejects an invalid sessionId', () => {
    const result = validateChatRequest({ sessionId: 'nope', question: 'A valid question here' });
    expect(result.valid).toBe(false);
  });
});
