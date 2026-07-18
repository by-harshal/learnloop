// Vanilla JS, no framework. All dynamic content is rendered with
// createElement/textContent, never innerHTML with interpolated strings, so
// model output can never inject markup (XSS safety).

const ingestForm = document.getElementById('ingest-form');
const urlField = document.getElementById('url-field');
const urlInput = document.getElementById('url-input');
const pdfField = document.getElementById('pdf-field');
const pdfInput = document.getElementById('pdf-input');
const ingestButton = document.getElementById('ingest-button');
const ingestStatus = document.getElementById('ingest-status');

const workspaceSection = document.getElementById('workspace-section');
const sourceTitleEl = document.getElementById('source-title');
const sourceMetaEl = document.getElementById('source-meta');
const featureButtons = Array.from(document.querySelectorAll('.feature-button'));
const featureStatus = document.getElementById('feature-status');
const featureResults = document.getElementById('feature-results');

const chatLog = document.getElementById('chat-log');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');

let currentSessionId = null;

// Each feature gets its own accent, echoed from the feature button colours in
// index.html, so a generated card visually matches the chip that produced it,
// like a colour-coded set of index cards.
const FEATURE_ACCENTS = {
  summary: { border: 'border-sky-500/50', text: 'text-sky-400', ring: 'focus:ring-sky-500' },
  mindmap: { border: 'border-violet-500/50', text: 'text-violet-400', ring: 'focus:ring-violet-500' },
  flashcards: { border: 'border-amber-500/50', text: 'text-amber-400', ring: 'focus:ring-amber-500' },
  quiz: { border: 'border-rose-500/50', text: 'text-rose-400', ring: 'focus:ring-rose-500' },
  assignments: { border: 'border-emerald-500/50', text: 'text-emerald-400', ring: 'focus:ring-emerald-500' },
  revisionNotes: { border: 'border-teal-500/50', text: 'text-teal-400', ring: 'focus:ring-teal-500' },
};

// ---------- Source type toggling ----------

ingestForm.addEventListener('change', (event) => {
  if (event.target.name === 'sourceType') {
    const isPdf = event.target.value === 'pdf';
    pdfField.hidden = !isPdf;
    urlField.hidden = isPdf;
  }
});

// ---------- Ingest ----------

ingestForm.addEventListener('submit', handleIngestSubmit);

async function handleIngestSubmit(event) {
  event.preventDefault();
  const sourceType = ingestForm.querySelector('input[name="sourceType"]:checked').value;

  setIngestLoading(true);
  setStatus(ingestStatus, 'Loading your source. This can take a few seconds…', false);

  try {
    const data = sourceType === 'pdf' ? await ingestPdf() : await ingestUrl(sourceType);
    currentSessionId = data.sessionId;
    showWorkspace(data);
    setStatus(ingestStatus, 'Source loaded. Pick something to generate below.', false);
  } catch (err) {
    setStatus(ingestStatus, err.message, true);
  } finally {
    setIngestLoading(false);
  }
}

async function ingestUrl(sourceType) {
  const url = urlInput.value.trim();
  if (!url) throw new Error('Please paste a URL first.');

  const response = await fetchJson('/api/ingest/url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sourceType, url }),
  });
  return response;
}

async function ingestPdf() {
  const file = pdfInput.files[0];
  if (!file) throw new Error('Please choose a PDF file first.');

  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/ingest/pdf', { method: 'POST', body: formData });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not process that PDF.');
  return data;
}

function setIngestLoading(isLoading) {
  ingestButton.disabled = isLoading;
  ingestButton.textContent = isLoading ? 'Loading…' : 'Load source';
}

function showWorkspace(data) {
  sourceTitleEl.textContent = data.title;
  sourceMetaEl.textContent = `${data.wordCount} words loaded.`;
  workspaceSection.hidden = false;
  featureResults.replaceChildren();
  chatLog.replaceChildren();
  featureButtons.forEach((button) => button.setAttribute('aria-pressed', 'false'));
  workspaceSection.scrollIntoView({ behavior: 'smooth' });
}

// ---------- Feature generation ----------

featureButtons.forEach((button) => {
  button.addEventListener('click', () => handleFeatureClick(button.dataset.feature, button));
});

async function handleFeatureClick(feature, button) {
  if (!currentSessionId) return;

  featureButtons.forEach((b) => b.setAttribute('aria-pressed', String(b === button)));
  setStatus(featureStatus, 'Generating…', false);
  featureResults.replaceChildren();

  try {
    const data = await fetchJson('/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId, feature }),
    });
    setStatus(featureStatus, 'Done.', false);
    renderFeature(feature, data.result);
  } catch (err) {
    setStatus(featureStatus, err.message, true);
  }
}

function renderFeature(feature, result) {
  const renderers = {
    summary: renderSummary,
    mindmap: renderMindmap,
    flashcards: renderFlashcards,
    quiz: renderQuiz,
    assignments: renderAssignments,
    revisionNotes: renderRevisionNotes,
  };
  const renderer = renderers[feature];
  if (renderer) renderer(result);
}

function makeCard(feature, titleText, spokenText) {
  const accent = FEATURE_ACCENTS[feature];

  const card = document.createElement('div');
  card.className = `bg-white/5 backdrop-blur-xl border border-white/10 border-l-4 ${accent.border} rounded-2xl shadow-xl p-5 md:p-6 transition-all duration-300 hover:bg-white/[0.07]`;

  const title = document.createElement('h3');
  title.className = `flex items-center gap-2 font-display font-bold text-xl ${accent.text} mb-4`;

  const titleLabel = document.createElement('span');
  titleLabel.textContent = titleText;
  title.appendChild(titleLabel);

  if (spokenText) {
    title.appendChild(makeSpeakerButton(spokenText, accent, card));
  }

  card.appendChild(title);
  return card;
}

function appendParagraph(container, text, className = 'text-slate-300 mb-3 leading-relaxed') {
  const p = document.createElement('p');
  p.className = className;
  p.textContent = text;
  container.appendChild(p);
}

function makeList(items, className = 'list-disc pl-5 space-y-1.5 text-slate-300') {
  const list = document.createElement('ul');
  list.className = className;
  items.forEach((text) => {
    const li = document.createElement('li');
    li.textContent = text;
    list.appendChild(li);
  });
  return list;
}

// ---------- Voice explanation (Web Speech API, native, no backend cost) ----------

function makeSpeakerButton(getSpokenText, accent, containerEl) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className =
    `speaker-button inline-flex items-center justify-center w-8 h-8 rounded-full border border-white/10 bg-white/5 ` +
    `text-base hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 ${accent ? accent.ring : 'focus:ring-slate-400'} ` +
    `aria-pressed:bg-teal-500/20 aria-pressed:text-teal-300 aria-pressed:border-teal-500/50 transition-all`;
  button.setAttribute('aria-pressed', 'false');
  button.setAttribute('aria-label', 'Read this aloud');
  button.textContent = '🔊';

  let teleprompterBox = null;

  button.addEventListener('click', () => {
    if (!('speechSynthesis' in window)) {
      button.setAttribute('aria-label', 'Voice reading is not supported in this browser');
      return;
    }

    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', 'Read this aloud');
      if (teleprompterBox) {
        teleprompterBox.remove();
        teleprompterBox = null;
      }
      return;
    }

    const text = typeof getSpokenText === 'function' ? getSpokenText() : getSpokenText;
    
    if (containerEl) {
      teleprompterBox = document.createElement('div');
      teleprompterBox.className = 'mt-4 p-4 rounded-xl bg-slate-900/80 border border-white/10 backdrop-blur-md text-slate-400 text-sm md:text-base leading-relaxed transition-all duration-300 shadow-inner';
      teleprompterBox.innerHTML = `<span>${text}</span>`;
      containerEl.appendChild(teleprompterBox);
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.onboundary = (event) => {
      if (event.name !== 'word' || !teleprompterBox) return;
      
      const charIndex = event.charIndex;
      const before = text.substring(0, charIndex);
      
      let wordLength = event.charLength || 0;
      if (!wordLength) {
        const nextSpace = text.indexOf(' ', charIndex);
        wordLength = nextSpace !== -1 ? nextSpace - charIndex : text.length - charIndex;
      }
      const word = text.substring(charIndex, charIndex + wordLength);
      const after = text.substring(charIndex + wordLength);
      
      const highlightBg = accent && accent.text ? accent.text.replace('text-', 'bg-').replace('-400', '-500') : 'bg-teal-500';
      const highlightClass = `${highlightBg} text-slate-900 font-bold rounded px-1 py-0.5 shadow-[0_0_10px_currentColor]`;
      
      teleprompterBox.innerHTML = `<span>${before}</span><span class="${highlightClass}">${word}</span><span>${after}</span>`;
    };

    utterance.onend = () => {
      button.setAttribute('aria-pressed', 'false');
      button.setAttribute('aria-label', 'Read this aloud');
      if (teleprompterBox) {
        teleprompterBox.remove();
        teleprompterBox = null;
      }
    };
    
    utterance.onerror = () => {
      button.setAttribute('aria-pressed', 'false');
      if (teleprompterBox) {
        teleprompterBox.remove();
        teleprompterBox = null;
      }
    };

    button.setAttribute('aria-pressed', 'true');
    button.setAttribute('aria-label', 'Stop reading');
    window.speechSynthesis.speak(utterance);
  });

  return button;
}

// ---------- Individual feature renderers ----------

function renderSummary(result) {
  const spoken = () => `${result.shortSummary} ${(result.keyPoints || []).join('. ')}`;
  const card = makeCard('summary', 'Summary', spoken);
  appendParagraph(card, result.shortSummary);
  card.appendChild(makeList(result.keyPoints || []));
  featureResults.appendChild(card);
}

function renderMindmap(result) {
  const card = makeCard('mindmap', 'Mind map', () =>
    [result.central, ...(result.branches || []).map((b) => `${b.title}: ${(b.children || []).join(', ')}`)].join(
      '. '
    )
  );

  const central = document.createElement('div');
  central.className = 'inline-block bg-violet-500/20 border border-violet-500/30 text-violet-300 font-bold rounded-full px-4 py-2 mb-5 shadow-[0_0_15px_rgba(139,92,246,0.15)]';
  central.textContent = result.central;
  card.appendChild(central);

  (result.branches || []).forEach((branch) => {
    const branchEl = document.createElement('div');
    branchEl.className = 'border-l-2 border-violet-500/30 pl-4 py-1.5 mb-4';

    const heading = document.createElement('h4');
    heading.className = 'font-semibold text-slate-200 mb-2';
    heading.textContent = branch.title;
    branchEl.appendChild(heading);
    branchEl.appendChild(makeList(branch.children || [], 'list-disc pl-5 text-slate-400 text-sm space-y-1'));

    card.appendChild(branchEl);
  });

  featureResults.appendChild(card);
}

function renderFlashcards(result) {
  const card = makeCard('flashcards', 'Flashcards');
  (result.flashcards || []).forEach((flashcard) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'border-t border-white/10 first:border-t-0 pt-4 mt-4 first:pt-0 first:mt-0 flex items-start justify-between gap-3';

    const textWrap = document.createElement('div');
    textWrap.className = 'flex-1';

    const front = document.createElement('p');
    front.className = 'font-medium text-slate-200';
    front.textContent = `Q: ${flashcard.front}`;
    textWrap.appendChild(front);

    const back = document.createElement('p');
    back.className = 'text-slate-400 mt-2';
    back.textContent = `A: ${flashcard.back}`;
    back.hidden = true;
    textWrap.appendChild(back);

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className =
      'mt-3 text-sm font-medium text-amber-400 border border-dashed border-amber-500/30 bg-amber-500/5 rounded-md px-3 py-1.5 hover:bg-amber-500/10 hover:border-amber-500/50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-slate-900 focus:ring-amber-500 transition-all';
    toggle.textContent = 'Show answer';
    toggle.addEventListener('click', () => {
      back.hidden = !back.hidden;
      toggle.textContent = back.hidden ? 'Show answer' : 'Hide answer';
    });
    textWrap.appendChild(toggle);

    wrapper.appendChild(textWrap);
    wrapper.appendChild(
      makeSpeakerButton(() => `${flashcard.front}. Answer: ${flashcard.back}`, FEATURE_ACCENTS.flashcards, wrapper)
    );

    card.appendChild(wrapper);
  });
  featureResults.appendChild(card);
}

function renderQuiz(result) {
  const card = makeCard('quiz', 'Quiz');
  (result.quiz || []).forEach((item, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'border-t border-white/10 first:border-t-0 pt-4 mt-4 first:pt-0 first:mt-0';

    const question = document.createElement('p');
    question.className = 'font-medium text-slate-200 mb-3';
    question.textContent = `${index + 1}. ${item.question}`;
    wrapper.appendChild(question);

    const list = document.createElement('ul');
    list.className = 'space-y-2 mb-3';
    (item.options || []).forEach((option, optionIndex) => {
      const li = document.createElement('li');
      const isCorrect = optionIndex === item.answerIndex;
      li.className = isCorrect
        ? 'font-semibold text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 rounded-lg px-3 py-2'
        : 'text-slate-400 border border-white/5 bg-white/5 rounded-lg px-3 py-2';
      li.textContent = isCorrect ? `${option} (correct)` : option;
      list.appendChild(li);
    });
    wrapper.appendChild(list);

    if (item.explanation) {
      appendParagraph(wrapper, item.explanation, 'text-sm text-slate-400 italic');
    }

    card.appendChild(wrapper);
  });
  featureResults.appendChild(card);
}

function renderAssignments(result) {
  const card = makeCard('assignments', 'Assignments');
  (result.assignments || []).forEach((assignment) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'border-t border-white/10 first:border-t-0 pt-4 mt-4 first:pt-0 first:mt-0';

    const heading = document.createElement('p');
    heading.className = 'font-semibold text-slate-200 mb-2';
    heading.textContent = `${assignment.title} (${assignment.estimatedMinutes} min)`;
    wrapper.appendChild(heading);
    appendParagraph(wrapper, assignment.instructions, 'text-slate-400 mt-1 leading-relaxed');

    card.appendChild(wrapper);
  });
  featureResults.appendChild(card);
}

function renderRevisionNotes(result) {
  const card = makeCard('revisionNotes', 'Revision notes', () =>
    (result.sections || []).map((s) => `${s.heading}. ${(s.points || []).join('. ')}`).join(' ')
  );

  (result.sections || []).forEach((section) => {
    const heading = document.createElement('h4');
    heading.className = 'font-semibold text-slate-200 mt-4 first:mt-0 mb-2';
    heading.textContent = section.heading;
    card.appendChild(heading);
    card.appendChild(makeList(section.points || [], 'list-disc pl-5 text-slate-400 space-y-1.5 mb-2'));
  });

  featureResults.appendChild(card);
}

// ---------- Chatbot ----------

chatForm.addEventListener('submit', handleChatSubmit);

async function handleChatSubmit(event) {
  event.preventDefault();
  if (!currentSessionId) return;

  const question = chatInput.value.trim();
  if (!question) return;

  appendChatTurn('You', question, true);
  chatInput.value = '';
  chatInput.disabled = true;

  try {
    const data = await fetchJson('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: currentSessionId, question }),
    });
    appendChatTurn('LearnLoop', data.answer, false);
  } catch (err) {
    appendChatTurn('LearnLoop', err.message, false);
  } finally {
    chatInput.disabled = false;
    chatInput.focus();
  }
}

function appendChatTurn(roleLabel, text, isUser) {
  const row = document.createElement('div');
  row.className = `flex ${isUser ? 'justify-end' : 'justify-start'}`;

  const bubble = document.createElement('div');
  bubble.className = isUser
    ? 'max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-teal-500 to-emerald-500 text-slate-950 px-4 py-3 text-sm shadow-[0_0_15px_rgba(20,184,166,0.2)]'
    : 'max-w-[85%] rounded-2xl rounded-tl-sm bg-white/5 border border-white/10 text-slate-200 px-4 py-3 text-sm backdrop-blur-md';

  const role = document.createElement('span');
  role.className = `block text-xs font-bold mb-1 ${isUser ? 'text-teal-950/70' : 'text-teal-400'}`;
  role.textContent = roleLabel;
  bubble.appendChild(role);

  const message = document.createElement('span');
  message.textContent = text;
  bubble.appendChild(message);

  row.appendChild(bubble);
  chatLog.appendChild(row);
  chatLog.scrollTop = chatLog.scrollHeight;
}

// ---------- Shared fetch helper ----------

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong. Please try again.');
  }
  return data;
}

function setStatus(el, message, isError) {
  el.textContent = message;
  el.classList.toggle('text-rose-400', isError);
  el.classList.toggle('text-teal-400', !isError);
  el.classList.toggle('text-slate-600', false);
}
