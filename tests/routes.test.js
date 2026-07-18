const request = require('supertest');

jest.mock('../server/lib/extractors', () => ({
  extractSource: jest.fn(),
}));
jest.mock('../server/lib/aiClient', () => ({
  generateStructuredJson: jest.fn(),
  generateChatReply: jest.fn(),
}));

const { extractSource } = require('../server/lib/extractors');
const { generateStructuredJson, generateChatReply } = require('../server/lib/aiClient');
const { createApp } = require('../server/index');
const { clearAllSessions } = require('../server/lib/sessionStore');

describe('LearnLoop routes', () => {
  let app;

  beforeEach(() => {
    app = createApp();
    extractSource.mockReset();
    generateStructuredJson.mockReset();
    generateChatReply.mockReset();
    clearAllSessions();
  });

  describe('POST /api/ingest/url', () => {
    test('returns 400 on an invalid sourceType', async () => {
      const response = await request(app)
        .post('/api/ingest/url')
        .send({ sourceType: 'not-real', url: 'https://example.com' });

      expect(response.status).toBe(400);
      expect(extractSource).not.toHaveBeenCalled();
    });

    test('returns 200 with a sessionId on success', async () => {
      extractSource.mockResolvedValue({ title: 'A blog post', text: 'Some article content here.' });

      const response = await request(app)
        .post('/api/ingest/url')
        .send({ sourceType: 'blog', url: 'https://example.com/post' });

      expect(response.status).toBe(200);
      expect(response.body.sessionId).toBeDefined();
      expect(response.body.title).toBe('A blog post');
      expect(response.body.wordCount).toBeGreaterThan(0);
    });

    test('returns 400 with the extractor message when extraction fails', async () => {
      extractSource.mockRejectedValue(new Error('That video has no transcript available.'));

      const response = await request(app)
        .post('/api/ingest/url')
        .send({ sourceType: 'youtube', url: 'https://youtu.be/abc' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('That video has no transcript available.');
    });
  });

  describe('POST /api/generate', () => {
    async function ingestASession() {
      extractSource.mockResolvedValue({ title: 'Lecture notes', text: 'Photosynthesis content.' });
      const ingestResponse = await request(app)
        .post('/api/ingest/url')
        .send({ sourceType: 'blog', url: 'https://example.com/lecture' });
      return ingestResponse.body.sessionId;
    }

    test('returns 400 on invalid feature', async () => {
      const sessionId = await ingestASession();
      const response = await request(app).post('/api/generate').send({ sessionId, feature: 'essay' });
      expect(response.status).toBe(400);
    });

    test('returns 404 for an unknown session', async () => {
      const response = await request(app)
        .post('/api/generate')
        .send({ sessionId: '123e4567-e89b-12d3-a456-426614174000', feature: 'summary' });
      expect(response.status).toBe(404);
    });

    test('returns 200 with the generated result for a valid request', async () => {
      const sessionId = await ingestASession();
      const fakeResult = { shortSummary: 'A summary.', keyPoints: ['point one'] };
      generateStructuredJson.mockResolvedValue(fakeResult);

      const response = await request(app).post('/api/generate').send({ sessionId, feature: 'summary' });

      expect(response.status).toBe(200);
      expect(response.body.feature).toBe('summary');
      expect(response.body.result).toEqual(fakeResult);
    });

    test('returns 500 with a safe message when the AI client throws', async () => {
      const sessionId = await ingestASession();
      generateStructuredJson.mockRejectedValue(new Error('upstream secret detail'));

      const response = await request(app).post('/api/generate').send({ sessionId, feature: 'quiz' });

      expect(response.status).toBe(500);
      expect(response.body.error).not.toMatch(/upstream secret detail/);
    });
  });

  describe('POST /api/chat', () => {
    async function ingestASession() {
      extractSource.mockResolvedValue({ title: 'Lecture notes', text: 'Photosynthesis content.' });
      const ingestResponse = await request(app)
        .post('/api/ingest/url')
        .send({ sourceType: 'blog', url: 'https://example.com/lecture' });
      return ingestResponse.body.sessionId;
    }

    test('returns 404 for an unknown session', async () => {
      const response = await request(app)
        .post('/api/chat')
        .send({ sessionId: '123e4567-e89b-12d3-a456-426614174000', question: 'What is this about?' });
      expect(response.status).toBe(404);
    });

    test('returns 200 with an answer and passes growing history on the next turn', async () => {
      const sessionId = await ingestASession();
      generateChatReply.mockResolvedValueOnce('Photosynthesis converts light to energy.');

      const first = await request(app)
        .post('/api/chat')
        .send({ sessionId, question: 'What is this about?' });

      expect(first.status).toBe(200);
      expect(first.body.answer).toBe('Photosynthesis converts light to energy.');
      expect(generateChatReply).toHaveBeenCalledWith(expect.any(String), [], 'What is this about?');

      generateChatReply.mockResolvedValueOnce('It happens in the chloroplast.');
      const second = await request(app).post('/api/chat').send({ sessionId, question: 'Where does it happen?' });

      expect(second.status).toBe(200);
      const historyPassedToSecondCall = generateChatReply.mock.calls[1][1];
      expect(historyPassedToSecondCall).toHaveLength(2);
    });
  });

  test('health check responds ok', async () => {
    const response = await request(app).get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});
