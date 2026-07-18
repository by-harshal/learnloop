const { GoogleGenAI } = require('@google/genai');

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-3.5-flash';
const MAX_OUTPUT_TOKENS = 2048;

let client = null;

function getClient() {
  if (!client) {
    if (!process.env.GEMINI_API_KEY) {
      // Fail loudly at call time, not at import time, so tests can mock this module
      // without needing a real key.
      throw new Error('GEMINI_API_KEY is not set.');
    }
    client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }
  return client;
}

/**
 * Calls Gemini with a system instruction and user content, expecting a JSON reply.
 * @param {string} systemInstruction
 * @param {string} userContent
 * @returns {Promise<object>} parsed JSON from the model
 */
async function generateStructuredJson(systemInstruction, userContent) {
  const ai = getClient();

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents: userContent,
    config: {
      systemInstruction,
      responseMimeType: 'application/json',
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });

  return parseModelJson(response.text);
}

/**
 * Calls Gemini for a single conversational reply, given prior turns and a new question.
 * @param {string} systemInstruction
 * @param {Array<{role: 'user'|'model', text: string}>} history
 * @param {string} question
 * @returns {Promise<string>} the model's plain-text reply
 */
async function generateChatReply(systemInstruction, history, question) {
  const ai = getClient();

  const contents = [
    ...history.map((turn) => ({ role: turn.role, parts: [{ text: turn.text }] })),
    { role: 'user', parts: [{ text: question }] },
  ];

  const response = await ai.models.generateContent({
    model: MODEL_NAME,
    contents,
    config: { systemInstruction, maxOutputTokens: MAX_OUTPUT_TOKENS },
  });

  return response.text.trim();
}

/**
 * Calls Gemini Imagen to generate a single image from a prompt.
 * @param {string} prompt
 * @returns {Promise<string>} base64 string of the generated image
 */
async function generateImage(prompt) {
  const ai = getClient();
  const response = await ai.models.generateImages({
    model: 'imagen-3.0-generate-002',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '16:9'
    }
  });

  const generatedImage = response.generatedImages[0];
  if (!generatedImage || !generatedImage.image || !generatedImage.image.imageBytes) {
    throw new Error('Image generation failed to return image bytes.');
  }
  
  return generatedImage.image.imageBytes;
}

/**
 * Parses the model's reply as JSON, stripping accidental markdown fences.
 */
function parseModelJson(rawText) {
  let cleaned = rawText.trim();
  // Extract JSON block if surrounded by markdown fences
  const match = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) {
    cleaned = match[1].trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('Failed to parse JSON. Raw text was:', rawText);
    throw new Error('Model did not return valid JSON.');
  }
}

module.exports = { generateStructuredJson, generateChatReply, generateImage, MODEL_NAME };
