const express = require('express');
const router = express.Router();
const axios = require('axios');
const { protect } = require('../middleware/authMiddleware');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:1b';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 180000);

router.use(protect);

// POST /api/ai/generate-question
// Body: { syllabus, topic, part, marks, difficulty, bloomLevel, courseOutcomes, previousQuestions }
router.post('/generate-question', async (req, res) => {
  const { syllabus, topic, part, marks, difficulty, bloomLevel, courseOutcomes = [], previousQuestions = [] } = req.body;

  if (!syllabus || !part || !marks) {
    return res.status(400).json({ success: false, error: 'syllabus, part, and marks are required' });
  }

  const difficultyGuide = {
    easy:   'straightforward, definition or recall based, suitable for average students',
    medium: 'requires understanding and application of concepts',
    hard:   'requires analysis, evaluation or design thinking, challenging for most students',
  }[difficulty] || 'moderate difficulty';

  const bloomGuide = bloomLevel
    ? `The question must target Bloom's taxonomy level ${bloomLevel}.`
    : `Part A questions target K1/K2, Part B target K2/K3, Part C target K3/K4/K5.`;

  const coList = courseOutcomes.length
    ? courseOutcomes.map(co => `${co.coNumber}: ${co.description}`).join('\n')
    : 'Not specified';

  const prevList = previousQuestions.length
    ? previousQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n')
    : 'None';

  const prompt = [
    'You are an expert university exam question paper setter for an engineering college.',
    'Generate exactly ONE exam question based on the details below.',
    '',
    `Syllabus/Topic: ${topic || syllabus.slice(0, 500)}`,
    `Full Syllabus Context: ${syllabus.slice(0, 1000)}`,
    `Part: ${part} | Marks: ${marks}`,
    `Difficulty: ${difficultyGuide}`,
    bloomGuide,
    '',
    'Course Outcomes:',
    coList,
    '',
    'Already generated questions (DO NOT repeat these topics):',
    prevList,
    '',
    'Rules:',
    '- Generate only ONE question',
    '- The question must be clear, academically appropriate, and match the marks',
    '- For 2-mark: short answer question (define/state/list)',
    '- For 6-mark: descriptive question (explain/describe/discuss)',
    '- For 12-mark: long answer or problem-solving question (analyze/design/evaluate)',
    '- Do NOT include the answer',
    '- Return ONLY valid JSON, no extra text',
    '',
    'Return this exact JSON schema:',
    '{',
    '  "questionText": "the full question text here",',
    '  "bloomLevel": "K1/K2/K3/K4/K5",',
    '  "suggestedCO": "CO1/CO2/CO3 etc",',
    '  "topic": "brief topic name"',
    '}',
  ].join('\n');

  try {
    const response = await axios.post(
      `${OLLAMA_URL}/api/generate`,
      { model: OLLAMA_MODEL, prompt, stream: false, format: 'json', options: { temperature: 0.7 } },
      { timeout: OLLAMA_TIMEOUT_MS }
    );

    const raw = response.data?.response || '';
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch {
      const first = raw.indexOf('{');
      const last = raw.lastIndexOf('}');
      if (first === -1 || last === -1) throw new Error('No JSON in response');
      parsed = JSON.parse(raw.slice(first, last + 1));
    }

    if (!parsed.questionText) throw new Error('Missing questionText in response');

    return res.json({ success: true, question: parsed });
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      return res.status(503).json({ success: false, error: 'Ollama is not running. Please start it with: ollama serve' });
    }
    return res.status(500).json({ success: false, error: err.message || 'Failed to generate question' });
  }
});

module.exports = router;
