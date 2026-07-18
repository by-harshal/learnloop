// One system instruction per feature. Kept separate from the route and the API
// client so a prompt tweak never touches request handling or network code.

const JSON_ONLY_RULE =
  'Reply with valid JSON only. No markdown fences, no preamble, no text outside the JSON object.';

const FEATURE_SYSTEM_INSTRUCTIONS = {
  summary:
    'You are a study coach who writes clear, short summaries of source material for learners. ' +
    JSON_ONLY_RULE +
    ' Return an object with keys: "shortSummary" (2-3 sentences) and "keyPoints" (array of 5-8 short bullet strings covering the most important ideas).',

  mindmap:
    'You are a study coach who turns source material into a mind map structure. ' +
    JSON_ONLY_RULE +
    ' Return an object with keys: "central" (a short string naming the core topic) and "branches" (array of 3-6 objects, ' +
    'each with "title" (a short string) and "children" (array of 2-5 short strings, sub-ideas under that branch).',

  flashcards:
    'You are a study coach who writes flashcards from source material for spaced-repetition style revision. ' +
    JSON_ONLY_RULE +
    ' Return an object with key "flashcards" (array of 8 objects, each with "front" (a question or term) and "back" (the answer or definition, 1-2 sentences)).',

  quiz:
    'You are a study coach who writes multiple choice quizzes from source material. ' +
    JSON_ONLY_RULE +
    ' Return an object with key "quiz" (array of 6 objects, each with "question", "options" (array of 4 strings), ' +
    '"answerIndex" (0-based index of the correct option), and "explanation" (1 sentence on why that answer is correct)).',

  assignments:
    'You are a study coach who designs short, hands-on practice assignments based on source material, ' +
    'so a learner can apply what they just read or watched instead of only recognising it in a quiz. ' +
    JSON_ONLY_RULE +
    ' Return an object with key "assignments" (array of 3 objects, each with "title", "instructions" (2-4 sentences describing what to do), ' +
    'and "estimatedMinutes" (a number)).',

  revisionNotes:
    'You are a study coach who turns source material into condensed revision notes for exam prep. ' +
    JSON_ONLY_RULE +
    ' Return an object with key "sections" (array of 3-6 objects, each with "heading" (a short string) and "points" ' +
    '(array of 3-6 short bullet strings under that heading)).',
};

const VALID_FEATURES = Object.keys(FEATURE_SYSTEM_INSTRUCTIONS);

/**
 * Builds the system instruction and user content for a feature.
 * @param {string} feature - one of VALID_FEATURES
 * @param {string} sourceText
 */
function buildFeaturePrompt(feature, sourceText) {
  const systemInstruction = FEATURE_SYSTEM_INSTRUCTIONS[feature];
  if (!systemInstruction) {
    throw new Error(`Unknown feature: ${feature}`);
  }
  return {
    systemInstruction,
    userContent: `Source material:\n\n${sourceText}`,
  };
}

/**
 * Builds the system instruction for the Q&A chatbot, grounded in the source text.
 * @param {string} sourceText
 */
function buildChatSystemInstruction(sourceText) {
  return (
    'You are a helpful tutor answering questions about one specific piece of source material. ' +
    'Answer only using the source material below. If the answer is not in it, say so plainly rather than guessing. ' +
    'Keep answers short and direct, 2-4 sentences unless the question needs a list. ' +
    `\n\nSource material:\n\n${sourceText}`
  );
}

module.exports = { buildFeaturePrompt, buildChatSystemInstruction, VALID_FEATURES };
