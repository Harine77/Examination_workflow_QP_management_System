const axios = require('axios');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2';
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS || 180000);
const OLLAMA_MAX_RETRIES = Number(process.env.OLLAMA_MAX_RETRIES || 3);

function inferQuestionType(questionText = '') {
  const text = String(questionText).toLowerCase();

  if (text.includes('define') || text.includes('what is') || text.includes('state')) {
    return 'definition';
  }
  if (text.includes('differentiate') || text.includes('compare') || text.includes('distinguish')) {
    return 'comparison';
  }
  if (text.includes('derive') || text.includes('prove') || text.includes('show that')) {
    return 'derivation';
  }
  if (text.includes('list') || text.includes('mention') || text.includes('enumerate')) {
    return 'listing';
  }
  if (text.includes('explain') || text.includes('describe') || text.includes('elaborate')) {
    return 'explanation';
  }
  if (text.includes('write short notes') || text.includes('short note')) {
    return 'short-note';
  }
  if (text.includes('calculate') || text.includes('solve') || text.includes('find')) {
    return 'problem-solving';
  }

  return 'general';
}

function getAnswerTemplate(marks, questionType) {
  const numericMarks = Number(marks) || 0;

  if (numericMarks <= 2) {
    return [
      'Use this structure:',
      '1. Direct answer/definition/result',
      '2. One supporting point, formula, or example only if needed',
      `Question style hint: ${questionType}`,
    ].join('\n');
  }

  if (numericMarks <= 6) {
    return [
      'Use this structure:',
      '1. Short introduction or direct statement',
      '2. 2 to 4 core explanation points / steps',
      '3. Formula, example, or use-case if the question needs it',
      `Question style hint: ${questionType}`,
    ].join('\n');
  }

  return [
    'Use this structure:',
    '1. Definition / introduction',
    '2. Main explanation in stepwise or paragraph form',
    '3. Important formula / diagram note / example where relevant',
    '4. Conclusion or final result',
    `Question style hint: ${questionType}`,
  ].join('\n');
}

function getMarkingGuidance(marks) {
  const numericMarks = Number(marks) || 0;

  if (numericMarks <= 2) {
    return {
      expectedDepth: 'very concise and exact',
      answerExpectation: '1 to 3 short sentences or bullet points only',
      markingExpectation: 'exactly 2 marking points at most, each worth about 1 mark',
      keyPointCount: { min: 1, max: 2 },
      markingStepCount: { min: 1, max: 2 },
      structureRule: 'Do not over-explain. Keep only the direct definition, formula, fact, or result needed for a 2-mark answer.',
    };
  }

  if (numericMarks <= 6) {
    return {
      expectedDepth: 'moderately detailed',
      answerExpectation: 'a short structured answer with important steps, sub-points, formulae, or examples',
      markingExpectation: '3 to 6 marking points with partial-credit coverage',
      keyPointCount: { min: 3, max: 6 },
      markingStepCount: { min: 3, max: 6 },
      structureRule: 'Give a compact but complete answer suitable for a mid-length academic response.',
    };
  }

  return {
    expectedDepth: 'detailed and comprehensive',
    answerExpectation: 'a complete long answer with explanation, steps, reasoning, and example or diagram description where appropriate',
    markingExpectation: '6 or more marking points with clear partial-credit guidance',
    keyPointCount: { min: 6, max: Math.max(6, numericMarks) },
    markingStepCount: { min: 6, max: Math.max(6, numericMarks) },
    structureRule: 'Use headings or structured paragraphs where useful and ensure the answer feels proportionate to a long-answer question.',
  };
}

function buildPaperOverview(paper) {
  const sortedQuestions = [...(paper.Questions || [])].sort((a, b) => {
    if (a.part !== b.part) return String(a.part).localeCompare(String(b.part));
    return Number(a.questionNumber) - Number(b.questionNumber);
  });

  const totalMarks = sortedQuestions.reduce((sum, question) => sum + (Number(question.marks) || 0), 0);
  const markPattern = sortedQuestions.reduce((acc, question) => {
    const key = `${question.marks}M`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return {
    sortedQuestions,
    totalMarks,
    markPattern,
  };
}

function buildOverviewText(paper, paperOverview) {
  const patternText = Object.entries(paperOverview.markPattern)
    .sort((a, b) => Number(a[0].replace('M', '')) - Number(b[0].replace('M', '')))
    .map(([marks, count]) => `${count} question(s) of ${marks}`)
    .join(', ');

  return [
    `Course: ${paper.Course?.courseCode || 'Unknown'} - ${paper.Course?.courseName || 'Unknown'}`,
    `Exam: ${paper.examType}${paper.catNumber ? ` ${paper.catNumber}` : ''}`,
    `Total questions: ${paperOverview.sortedQuestions.length}`,
    `Total marks: ${paperOverview.totalMarks}`,
    `Mark pattern: ${patternText || 'unknown'}`,
  ].join('\n');
}

function buildQuestionPrompt(paper, question, paperOverview) {
  const guidance = getMarkingGuidance(question.marks);
  const questionType = inferQuestionType(question.questionText);

  return [
    'You are preparing an academic answer key for faculty evaluators.',
    'Generate the answer key for exactly one question only.',
    'The answer must strictly follow the marks allotted in the question paper.',
    'Do not generate an answer that is too short or too long for the marks.',
    guidance.structureRule,
    `This exact question carries ${question.marks} marks.`,
    `Expected depth: ${guidance.expectedDepth}.`,
    `Expected answer length: ${guidance.answerExpectation}.`,
    `Expected marking scheme: ${guidance.markingExpectation}.`,
    `Return ${guidance.keyPointCount.min} to ${guidance.keyPointCount.max} key points depending on the marks.`,
    `Return ${guidance.markingStepCount.min} to ${guidance.markingStepCount.max} marking scheme items depending on the marks.`,
    getAnswerTemplate(question.marks, questionType),
    'The marking scheme must match the question and be suitable for awarding partial credit.',
    'If the question asks for explanation, derivation, comparison, procedure, or short note, reflect that correctly.',
    'If the question is a very short answer, avoid unnecessary paragraphs.',
    'Return only valid JSON with this schema:',
    '{',
    '  "part": "A/B/C",',
    '  "questionNumber": number,',
    '  "marks": number,',
    '  "expectedDepth": "concise/moderate/detailed",',
    '  "answerKey": "model answer",',
    '  "keyPoints": ["point 1", "point 2"],',
    '  "markingScheme": ["marking item 1", "marking item 2"],',
    '  "examinerNotes": "brief evaluator note"',
    '}',
    '',
    'Question paper context:',
    buildOverviewText(paper, paperOverview),
    '',
    `Current question: Part ${question.part}, Q${question.questionNumber}`,
    `Marks: ${question.marks}`,
    `Question type hint: ${questionType}`,
    `Question text: ${question.questionText}`,
  ].join('\n');
}

function buildRepairPrompt(paper, question, paperOverview, previousError, previousResponse) {
  const guidance = getMarkingGuidance(question.marks);
  const questionType = inferQuestionType(question.questionText);

  return [
    'Your previous answer-key JSON was invalid or did not match the required mark structure.',
    `Validation issue: ${previousError}`,
    'Regenerate the answer for this one question only.',
    'Be more precise and strictly follow the marks and question wording.',
    getAnswerTemplate(question.marks, questionType),
    `For this ${question.marks}-mark question, the answer depth must be: ${guidance.expectedDepth}.`,
    `The marking scheme must contain at least ${guidance.markingStepCount.min} step(s).`,
    `The key points must contain at least ${guidance.keyPointCount.min} point(s).`,
    'Return only corrected JSON in the required schema.',
    '',
    'Question paper context:',
    buildOverviewText(paper, paperOverview),
    '',
    `Current question: Part ${question.part}, Q${question.questionNumber}`,
    `Marks: ${question.marks}`,
    `Question type hint: ${questionType}`,
    `Question text: ${question.questionText}`,
    '',
    'Previous invalid response:',
    previousResponse || '(empty)',
  ].join('\n');
}

function extractJson(text) {
  if (!text) {
    throw new Error('Ollama returned an empty response');
  }

  const trimmed = text.trim();

  try {
    return JSON.parse(trimmed);
  } catch (_) {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      throw new Error('Could not find JSON in the Ollama response');
    }

    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

function normalizeAnswerKeyItem(item, fallbackQuestion) {
  const fallbackMarks = Number(fallbackQuestion?.marks) || Number(item?.marks) || 0;
  const guidance = getMarkingGuidance(fallbackMarks);

  return {
    part: item?.part || fallbackQuestion?.part || null,
    questionNumber: Number(item?.questionNumber ?? fallbackQuestion?.questionNumber ?? 0),
    marks: Number(item?.marks) || fallbackMarks,
    expectedDepth: item?.expectedDepth || (fallbackMarks <= 2 ? 'concise' : fallbackMarks <= 6 ? 'moderate' : 'detailed'),
    answerKey: typeof item?.answerKey === 'string' ? item.answerKey.trim() : '',
    keyPoints: normalizeStringArray(item?.keyPoints),
    markingScheme: normalizeStringArray(item?.markingScheme),
    examinerNotes: typeof item?.examinerNotes === 'string' ? item.examinerNotes.trim() : guidance.markingExpectation,
  };
}

function validateAnswerKeyItem(item, question) {
  if (!item.answerKey) {
    throw new Error(`Missing answer key for Part ${question.part} Q${question.questionNumber}`);
  }

  if (String(item.part) !== String(question.part) || Number(item.questionNumber) !== Number(question.questionNumber)) {
    throw new Error(`Ollama returned mismatched question metadata for Part ${question.part} Q${question.questionNumber}`);
  }

  if (Number(item.marks) !== Number(question.marks)) {
    item.marks = Number(question.marks);
  }

  const guidance = getMarkingGuidance(question.marks);

  if (item.keyPoints.length < guidance.keyPointCount.min) {
    throw new Error(`Not enough key points for Part ${question.part} Q${question.questionNumber}`);
  }

  if (item.markingScheme.length < guidance.markingStepCount.min) {
    throw new Error(`Marking scheme is too short for Part ${question.part} Q${question.questionNumber}`);
  }

  if (Number(question.marks) <= 2 && item.answerKey.length > 500) {
    throw new Error(`2-mark answer is too long for Part ${question.part} Q${question.questionNumber}`);
  }

  if (Number(question.marks) >= 10 && item.answerKey.length < 250) {
    throw new Error(`Long-answer response is too short for Part ${question.part} Q${question.questionNumber}`);
  }

  return item;
}

async function callOllama(prompt) {
  const response = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    {
      model: OLLAMA_MODEL,
      prompt,
      stream: false,
      format: 'json',
      options: {
        temperature: 0.2,
      },
    },
    {
      timeout: OLLAMA_TIMEOUT_MS,
    }
  );

  return {
    parsed: extractJson(response.data?.response),
    model: response.data?.model || OLLAMA_MODEL,
  };
}

async function generateQuestionAnswerKey(paper, question, paperOverview) {
  let lastError = null;
  let lastResponseText = '';

  for (let attempt = 1; attempt <= OLLAMA_MAX_RETRIES; attempt += 1) {
    const prompt = attempt === 1
      ? buildQuestionPrompt(paper, question, paperOverview)
      : buildRepairPrompt(paper, question, paperOverview, lastError?.message || 'Unknown validation failure', lastResponseText);

    try {
      const response = await axios.post(
        `${OLLAMA_URL}/api/generate`,
        {
          model: OLLAMA_MODEL,
          prompt,
          stream: false,
          format: 'json',
          options: {
            temperature: attempt === 1 ? 0.2 : 0.1,
          },
        },
        {
          timeout: OLLAMA_TIMEOUT_MS,
        }
      );

      lastResponseText = response.data?.response || '';
      const parsed = extractJson(lastResponseText);
      const normalized = normalizeAnswerKeyItem(parsed, question);

      return {
        item: validateAnswerKeyItem(normalized, question),
        model: response.data?.model || OLLAMA_MODEL,
      };
    } catch (error) {
      lastError = error;
      console.warn(
        `[Ollama Answer Key] Attempt ${attempt}/${OLLAMA_MAX_RETRIES} failed for Part ${question.part} Q${question.questionNumber}: ${error.message}`
      );
    }
  }

  throw lastError || new Error(`Failed to generate answer key for Part ${question.part} Q${question.questionNumber}`);
}

async function generateAnswerKey(paper) {
  const paperOverview = buildPaperOverview(paper);

  if (!paperOverview.sortedQuestions.length) {
    throw new Error('No questions found in the paper for answer-key generation');
  }

  try {
    const generatedItems = [];
    let lastModel = OLLAMA_MODEL;

    for (const question of paperOverview.sortedQuestions) {
      const { item, model } = await generateQuestionAnswerKey(paper, question, paperOverview);
      generatedItems.push(item);
      lastModel = model || lastModel;
    }

    const patternText = Object.entries(paperOverview.markPattern)
      .sort((a, b) => Number(a[0].replace('M', '')) - Number(b[0].replace('M', '')))
      .map(([marks, count]) => `${count} x ${marks}`)
      .join(', ');

    return {
      answerKey: {
        overview: `Question-wise answer key generated for ${paper.Course?.courseCode || 'the paper'} following the paper mark structure (${patternText}).`,
        items: generatedItems,
      },
      model: lastModel,
    };
  } catch (error) {
    if (error.response) {
      throw new Error(`Ollama request failed with status ${error.response.status}`);
    }
    if (error.code === 'ECONNREFUSED') {
      throw new Error(`Could not connect to Ollama at ${OLLAMA_URL}`);
    }
    throw new Error(error.message || 'Failed to generate answer key with Ollama');
  }
}

module.exports = {
  generateAnswerKey,
};
