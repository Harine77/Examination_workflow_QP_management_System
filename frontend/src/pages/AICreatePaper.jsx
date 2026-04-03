import { useState, useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import api from '../services/api';

const EXAM_SLOTS = {
  CAT: { A: { count: 4, marks: 2 }, B: { count: 3, marks: 6 }, C: { count: 4, marks: 12 } },
  SAT: { A: { count: 4, marks: 2 }, B: { count: 3, marks: 6 }, C: { count: 4, marks: 12 } },
  SEM: { A: { count: 5, marks: 2 }, B: { count: 5, marks: 6 }, C: { count: 10, marks: 12 } },
};
const DIFFICULTY_OPTIONS = ['easy', 'medium', 'hard'];
const BLOOM_BY_PART = { A: ['K1', 'K2'], B: ['K2', 'K3'], C: ['K3', 'K4', 'K5'] };
const STEPS = ['Exam Type', 'Course & Syllabus', 'Difficulty', 'Generate Questions', 'Review & Save'];
const SAVE_KEY = 'ai_paper_draft';

const OLLAMA_URL = () => import.meta.env.VITE_OLLAMA_URL || 'http://127.0.0.1:11434';
const OLLAMA_MODEL = () => import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:1b';

function StepBar({ current }) {
  return (
    <div className="flex items-center gap-0 mb-10">
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center flex-1 last:flex-none">
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all
              ${i < current ? 'bg-green-600 text-white' : i === current ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-500'}`}>
              {i < current ? '✓' : i + 1}
            </div>
            <span className={`text-xs mt-1 whitespace-nowrap ${i === current ? 'text-slate-900 font-semibold' : 'text-slate-400'}`}>{label}</span>
          </div>
          {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 mx-2 mb-4 ${i < current ? 'bg-green-500' : 'bg-slate-200'}`} />}
        </div>
      ))}
    </div>
  );
}

async function callOllama(prompt) {
  const res = await fetch(`${OLLAMA_URL()}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: OLLAMA_MODEL(),
      prompt,
      stream: false,
      format: 'json',
      options: { temperature: 0.85, num_predict: 300 },
    }),
  });
  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}`);
  const data = await res.json();
  const raw = (data.response || '').trim();
  try { return JSON.parse(raw); }
  catch {
    const f = raw.indexOf('{'), l = raw.lastIndexOf('}');
    if (f !== -1 && l !== -1) return JSON.parse(raw.slice(f, l + 1));
    throw new Error('No JSON in Ollama response');
  }
}

export default function AICreatePaper() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [examType, setExamType] = useState('');
  const [catNumber, setCatNumber] = useState('I');
  const [examDate, setExamDate] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [semester, setSemester] = useState('');
  const [syllabus, setSyllabus] = useState('');
  const [courseOutcomes, setCourseOutcomes] = useState([
    { coNumber: 'CO1', description: '', keywords: '' },
    { coNumber: 'CO2', description: '', keywords: '' },
    { coNumber: 'CO3', description: '', keywords: '' },
  ]);
  const [difficulty, setDifficulty] = useState({ A: 'medium', B: 'medium', C: 'hard' });
  const [bloomOverride, setBloomOverride] = useState({ A: '', B: '', C: '' });
  const [slots, setSlots] = useState([]);
  const [currentSlotIdx, setCurrentSlotIdx] = useState(0);
  const [generating, setGenerating] = useState(false);
  const [generatedQuestion, setGeneratedQuestion] = useState(null);
  const [confirmed, setConfirmed] = useState([]);
  const [saving, setSaving] = useState(false);
  const [courseId, setCourseId] = useState(null);
  const [coIdMap, setCoIdMap] = useState({});
  const [existingQuestions, setExistingQuestions] = useState([]);
  const [hasDraft, setHasDraft] = useState(false);
  const autoSaveTimer = useRef(null);

  // ── Load draft on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    const draft = localStorage.getItem(SAVE_KEY);
    if (draft) setHasDraft(true);
  }, []);

  // ── Auto-save whenever confirmed changes ─────────────────────────────────────
  useEffect(() => {
    if (confirmed.length === 0 && step < 3) return;
    clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      const draft = { step, examType, catNumber, examDate, courseCode, courseName, semester, syllabus, courseOutcomes, difficulty, bloomOverride, slots, currentSlotIdx, confirmed, courseId, coIdMap };
      localStorage.setItem(SAVE_KEY, JSON.stringify(draft));
      if (confirmed.length > 0) toast.info('Draft auto-saved', { autoClose: 1500, toastId: 'autosave' });
    }, 2000);
    return () => clearTimeout(autoSaveTimer.current);
  }, [confirmed, step]);

  const loadDraft = () => {
    try {
      const draft = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}');
      if (!draft.examType) return;
      setStep(draft.step || 0);
      setExamType(draft.examType || '');
      setCatNumber(draft.catNumber || 'I');
      setExamDate(draft.examDate || '');
      setCourseCode(draft.courseCode || '');
      setCourseName(draft.courseName || '');
      setSemester(draft.semester || '');
      setSyllabus(draft.syllabus || '');
      setCourseOutcomes(draft.courseOutcomes || []);
      setDifficulty(draft.difficulty || { A: 'medium', B: 'medium', C: 'hard' });
      setBloomOverride(draft.bloomOverride || { A: '', B: '', C: '' });
      setSlots(draft.slots || []);
      setCurrentSlotIdx(draft.currentSlotIdx || 0);
      setConfirmed(draft.confirmed || []);
      setCourseId(draft.courseId || null);
      setCoIdMap(draft.coIdMap || {});
      setHasDraft(false);
      toast.success('Draft restored!');
    } catch { toast.error('Failed to load draft'); }
  };

  const clearDraft = () => { localStorage.removeItem(SAVE_KEY); setHasDraft(false); };

  const buildSlots = useCallback((type) => {
    const cfg = EXAM_SLOTS[type];
    const result = [];
    ['A', 'B', 'C'].forEach(part => {
      for (let i = 0; i < cfg[part].count; i++)
        result.push({ part, index: i, marks: cfg[part].marks, label: `Part ${part} Q${i + 1}` });
    });
    return result;
  }, []);

  const handleSelectExam = (type) => { setExamType(type); setStep(1); };

  // ── Fetch existing questions for this course to avoid duplicates ─────────────
  const fetchExistingQuestions = async (cId) => {
    try {
      const res = await api.get('/questions/papers', { params: {} });
      const papers = res.data.data || [];
      const questions = [];
      for (const p of papers) {
        if (p.Course?.id === cId || p.CourseId === cId) {
          const detail = await api.get(`/questions/papers/${p.id}`);
          (detail.data.data?.Questions || []).forEach(q => questions.push(q.questionText));
        }
      }
      setExistingQuestions(questions);
    } catch { /* non-critical */ }
  };

  const handleSaveCourse = async () => {
    if (!courseCode.trim() || !courseName.trim()) return toast.error('Course code and name are required');
    if (!syllabus.trim()) return toast.error('Please enter the syllabus');
    if (courseOutcomes.some(co => !co.description.trim())) return toast.error('Fill all Course Outcome descriptions');
    try {
      const res = await api.post('/courses', {
        courseCode, courseName, semester: parseInt(semester) || 1, syllabus,
        outcomes: courseOutcomes.map(co => ({
          coNumber: co.coNumber, description: co.description,
          keywords: co.keywords.split(',').map(k => k.trim()).filter(Boolean),
        })),
      });
      const saved = res.data.data;
      
      // Check if faculty is enrolled in this course
      const userRes = await api.get('/auth/me');
      const enrolledCourses = userRes.data.data?.enrolledCourses || [];
      
      if (!enrolledCourses.includes(saved.id)) {
        // Auto-request enrollment for this course
        try {
          await api.post('/auth/request-courses', { courseIds: [saved.id] });
          toast.warning('Course created! Enrollment request sent to HOD. You can generate papers after approval.', { autoClose: 5000 });
        } catch (err) {
          toast.error('Course created but failed to request enrollment. Please request manually from dashboard.');
        }
        return;
      }
      
      setCourseId(saved.id);
      const map = {};
      (saved.CourseOutcomes || []).forEach(co => { map[co.coNumber] = co.id; });
      setCoIdMap(map);
      await fetchExistingQuestions(saved.id);
      toast.success('Course saved!');
      setStep(2);
    } catch (err) {
      toast.error('Failed to save course: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleStartGeneration = () => {
    const allSlots = buildSlots(examType);
    setSlots(allSlots);
    setCurrentSlotIdx(confirmed.length); // resume from where left off
    setGeneratedQuestion(null);
    setStep(3);
  };

  // ── Generate question ────────────────────────────────────────────────────────
  const generateQuestion = async (slotIdx) => {
    const slot = slots[slotIdx];
    if (!slot) return;
    setGenerating(true);
    setGeneratedQuestion(null);

    const bloomHint = bloomOverride[slot.part] ||
      (slot.part === 'A' ? 'K1' : slot.part === 'B' ? 'K2' : 'K3');

    const allUsed = [...existingQuestions, ...confirmed.map(c => c.questionText)];
    // Pass full question texts so Ollama can detect similarity
    const usedList = allUsed.length
      ? allUsed.map((q, i) => `${i + 1}. ${q}`).join('\n')
      : 'none';

    // Short focused syllabus extract
    const syllabusSnip = syllabus.slice(0, 400);

    const verb = slot.marks <= 2
      ? 'Define or state'
      : slot.marks <= 6
      ? 'Explain or describe'
      : 'Analyze or discuss in detail';

    // Include slot index to force variety across questions
    const slotHint = `This is question ${slot.index + 1} of ${EXAM_SLOTS[examType][slot.part].count} for Part ${slot.part}. Pick a DIFFERENT topic from the others.`;

    const prompt = `You are an engineering exam question setter. Generate ONE unique ${slot.marks}-mark question.
Syllabus: ${syllabusSnip}
Bloom level: ${bloomHint}. Style: ${verb}.
${slotHint}

ALREADY ASKED QUESTIONS — do NOT repeat or rephrase any of these:
${usedList}

Pick a completely different topic or concept not covered above.
Return JSON only: {"questionText":"...","bloomLevel":"${bloomHint}","suggestedCO":"CO1","topic":"..."}`;

    try {
      const parsed = await callOllama(prompt);
      if (!parsed.questionText) throw new Error('No question returned');
      const bloomLevel = parsed.bloomLevel || bloomHint;
      const suggestedCO = parsed.suggestedCO || await detectCO(parsed.questionText);
      setGeneratedQuestion({ ...parsed, bloomLevel, suggestedCO, slot });
    } catch (err) {
      if (err.message.includes('fetch') || err.message.includes('Failed to fetch')) {
        toast.error('Cannot reach Ollama. Run: ollama serve');
      } else {
        toast.error('Generation failed: ' + err.message);
      }
    } finally {
      setGenerating(false);
    }
  };

  // ── CO detection using keyword matching ──────────────────────────────────────
  const detectCO = async (questionText) => {
    if (!courseOutcomes.length) return 'CO1';
    const text = questionText.toLowerCase();
    let bestCO = courseOutcomes[0].coNumber;
    let bestScore = 0;
    for (const co of courseOutcomes) {
      const keywords = co.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
      const descWords = co.description.toLowerCase().split(/\s+/);
      const allTerms = [...keywords, ...descWords];
      const score = allTerms.filter(term => term.length > 3 && text.includes(term)).length;
      if (score > bestScore) { bestScore = score; bestCO = co.coNumber; }
    }
    return bestCO;
  };

  // ── KL detection using Bloom's verb matching ─────────────────────────────────
  const detectKL = (questionText) => {
    const text = questionText.toLowerCase();
    const levels = [
      { level: 'K5', verbs: ['evaluate', 'justify', 'critique', 'assess', 'design', 'develop', 'create', 'formulate', 'construct', 'propose'] },
      { level: 'K4', verbs: ['analyze', 'analyse', 'differentiate', 'distinguish', 'examine', 'compare', 'contrast', 'investigate'] },
      { level: 'K3', verbs: ['apply', 'solve', 'demonstrate', 'calculate', 'implement', 'compute', 'derive', 'simulate'] },
      { level: 'K2', verbs: ['explain', 'discuss', 'describe', 'summarize', 'interpret', 'illustrate', 'elaborate'] },
      { level: 'K1', verbs: ['define', 'list', 'state', 'name', 'identify', 'recall', 'label'] },
    ];
    for (const { level, verbs } of levels) {
      if (verbs.some(v => new RegExp(`\\b${v}\\b`).test(text))) return level;
    }
    return 'K2';
  };

  const confirmQuestion = async () => {
    if (!generatedQuestion) return;
    const kl = detectKL(generatedQuestion.questionText);
    const co = generatedQuestion.suggestedCO || await detectCO(generatedQuestion.questionText);
    setConfirmed(prev => [...prev, {
      part: generatedQuestion.slot.part,
      index: generatedQuestion.slot.index,
      marks: generatedQuestion.slot.marks,
      questionText: generatedQuestion.questionText,
      bloomLevel: kl,
      suggestedCO: co,
    }]);
    const next = currentSlotIdx + 1;
    setCurrentSlotIdx(next);
    setGeneratedQuestion(null);
    if (next >= slots.length) setStep(4);
  };

  const editConfirmed = (idx, text) => {
    setConfirmed(prev => prev.map((q, i) => i === idx ? { ...q, questionText: text, bloomLevel: detectKL(text) } : q));
  };

  const savePaper = async () => {
    setSaving(true);
    try {
      const paperRes = await api.post('/questions/paper', {
        courseId, examType,
        catNumber: ['CAT', 'SAT'].includes(examType) ? catNumber : null,
        examDate: examDate || null,
      });
      const pid = paperRes.data.data.id;

      // Assign proper question numbers per part
      const partCounters = { A: 0, B: 0, C: 0 };
      const questionPayload = confirmed.map(q => {
        partCounters[q.part]++;
        return {
          part: q.part,
          questionNumber: partCounters[q.part],
          questionText: q.questionText,
          marks: q.marks,
          klLevel: q.bloomLevel || detectKL(q.questionText),
          piIndicators: [],
          courseOutcomeId: coIdMap[q.suggestedCO] || null,
        };
      });

      await api.post(`/questions/papers/${pid}/questions`, { questions: questionPayload });
      await api.post(`/questions/papers/${pid}/submit`);

      clearDraft();
      toast.success('Paper submitted to Scrutinizer 1!');
      navigate('/papers');
    } catch (err) {
      toast.error('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  const currentSlot = slots[currentSlotIdx];
  const progress = slots.length ? Math.round((confirmed.length / slots.length) * 100) : 0;

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 py-10">
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate('/dashboard')} className="text-slate-500 hover:text-slate-800 text-sm font-medium">← Back</button>
          <h1 className="text-2xl font-bold text-slate-900">AI Question Paper Generator</h1>
          {confirmed.length > 0 && (
            <span className="ml-auto text-xs bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-full font-semibold">
              Draft auto-saved
            </span>
          )}
        </div>

        {/* Draft resume banner */}
        {hasDraft && step === 0 && (
          <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="font-semibold text-amber-800 text-sm">You have an unsaved draft</p>
              <p className="text-xs text-amber-600 mt-0.5">Resume where you left off</p>
            </div>
            <div className="flex gap-2">
              <button onClick={clearDraft} className="px-3 py-1.5 rounded-lg bg-white border border-amber-200 text-amber-700 text-xs font-semibold hover:bg-amber-50">Discard</button>
              <button onClick={loadDraft} className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-semibold hover:bg-amber-700">Resume Draft</button>
            </div>
          </div>
        )}

        <StepBar current={step} />

        {/* STEP 0 */}
        {step === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Select Exam Type</h2>
            <div className="grid grid-cols-3 gap-4">
              {[
                { type: 'CAT', label: 'CAT', sub: 'Continuous Assessment', info: '50 Marks · 90 min', color: 'bg-blue-700 hover:bg-blue-800' },
                { type: 'SAT', label: 'SAT', sub: 'Summative Assessment', info: '50 Marks · 90 min', color: 'bg-teal-700 hover:bg-teal-800' },
                { type: 'SEM', label: 'SEM', sub: 'End Semester Exam', info: '100 Marks · 3 hrs', color: 'bg-purple-700 hover:bg-purple-800' },
              ].map(e => (
                <button key={e.type} onClick={() => handleSelectExam(e.type)}
                  className={`${e.color} text-white rounded-xl p-6 text-left transition hover:shadow-lg hover:-translate-y-0.5`}>
                  <div className="text-2xl font-bold mb-1">{e.label}</div>
                  <div className="text-sm opacity-80">{e.sub}</div>
                  <div className="text-xs opacity-60 mt-2">{e.info}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 1 */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-5">
            <h2 className="text-lg font-bold text-slate-800">Course Details & Syllabus</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Course Code *</label>
                <input className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-400" placeholder="e.g. UIT2504" value={courseCode} onChange={e => setCourseCode(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Course Name *</label>
                <input className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-400" placeholder="e.g. Artificial Intelligence" value={courseName} onChange={e => setCourseName(e.target.value)} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Semester</label>
                <input type="number" className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-400" placeholder="5" value={semester} onChange={e => setSemester(e.target.value)} />
              </div>
              {['CAT', 'SAT'].includes(examType) && (<>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">{examType} Number</label>
                  <select className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-400" value={catNumber} onChange={e => setCatNumber(e.target.value)}>
                    <option value="I">I</option><option value="II">II</option><option value="III">III</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Exam Date</label>
                  <input type="date" className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:outline-none focus:border-blue-400" value={examDate} onChange={e => setExamDate(e.target.value)} />
                </div>
              </>)}
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Syllabus / Topics *</label>
              <textarea className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-400" rows={5} placeholder="Paste the full syllabus. AI uses this to generate unique questions." value={syllabus} onChange={e => setSyllabus(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wide">Course Outcomes *</label>
              <div className="space-y-3">
                {courseOutcomes.map((co, i) => (
                  <div key={co.coNumber} className="bg-slate-50 rounded-lg p-3 space-y-2">
                    <span className="text-xs font-bold text-blue-700">{co.coNumber}</span>
                    <input className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-400" placeholder="Description" value={co.description} onChange={e => { const u = [...courseOutcomes]; u[i].description = e.target.value; setCourseOutcomes(u); }} />
                    <input className="w-full border border-slate-200 rounded-lg p-2 text-sm focus:outline-none focus:border-blue-400" placeholder="Keywords (comma separated)" value={co.keywords} onChange={e => { const u = [...courseOutcomes]; u[i].keywords = e.target.value; setCourseOutcomes(u); }} />
                  </div>
                ))}
                <button onClick={() => setCourseOutcomes(p => [...p, { coNumber: `CO${p.length + 1}`, description: '', keywords: '' }])} className="text-sm text-blue-600 hover:text-blue-800 font-medium">+ Add CO</button>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(0)} className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm">← Back</button>
              <button onClick={handleSaveCourse} className="flex-1 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm">Save & Continue →</button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 space-y-6">
            <h2 className="text-lg font-bold text-slate-800">Set Difficulty per Part</h2>
            {['A', 'B', 'C'].map(part => (
              <div key={part} className="rounded-xl border border-slate-200 p-5 space-y-3">
                <div><span className="font-bold text-slate-900">Part {part}</span><span className="ml-2 text-sm text-slate-500">{EXAM_SLOTS[examType][part].count} questions · {EXAM_SLOTS[examType][part].marks} marks each</span></div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Difficulty</label>
                  <div className="flex gap-2">
                    {DIFFICULTY_OPTIONS.map(d => (
                      <button key={d} onClick={() => setDifficulty(p => ({ ...p, [part]: d }))}
                        className={`flex-1 py-2 rounded-lg text-sm font-semibold capitalize transition ${difficulty[part] === d ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>{d}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">Bloom's Level (optional)</label>
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => setBloomOverride(p => ({ ...p, [part]: '' }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${!bloomOverride[part] ? 'bg-slate-900 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>Auto</button>
                    {BLOOM_BY_PART[part].map(b => (
                      <button key={b} onClick={() => setBloomOverride(p => ({ ...p, [part]: b }))} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${bloomOverride[part] === b ? 'bg-blue-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-600'}`}>{b}</button>
                    ))}
                  </div>
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm">← Back</button>
              <button onClick={handleStartGeneration} className="flex-1 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm">Start Generating →</button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 3 && currentSlot && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-slate-700">Progress</span>
                <span className="text-sm text-slate-500">{confirmed.length} / {slots.length} confirmed</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
              <div className="flex gap-1 mt-3 flex-wrap">
                {slots.map((s, i) => (
                  <div key={i} className={`w-7 h-7 rounded-md text-xs font-bold flex items-center justify-center
                    ${i < confirmed.length ? 'bg-green-500 text-white' : i === currentSlotIdx ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {s.part}{s.index + 1}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-900 text-lg">{currentSlot.label}</h3>
                  <p className="text-sm text-slate-500">{currentSlot.marks} marks · {difficulty[currentSlot.part]} difficulty</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
                  {bloomOverride[currentSlot.part] || `Auto (${BLOOM_BY_PART[currentSlot.part].join('/')})`}
                </span>
              </div>

              {!generatedQuestion && !generating && (
                <button onClick={() => generateQuestion(currentSlotIdx)} className="w-full py-3 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold transition">
                  Generate Question
                </button>
              )}

              {generating && (
                <div className="flex items-center justify-center gap-3 py-8 text-slate-500">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm">Generating with Ollama...</span>
                </div>
              )}

              {generatedQuestion && !generating && (
                <div className="space-y-4">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">Generated Question</span>
                      {generatedQuestion.bloomLevel && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{generatedQuestion.bloomLevel}</span>}
                      {generatedQuestion.suggestedCO && <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">{generatedQuestion.suggestedCO}</span>}
                      {generatedQuestion.topic && <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-xs">{generatedQuestion.topic}</span>}
                    </div>
                    <textarea className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-400" rows={4}
                      value={generatedQuestion.questionText} onChange={e => setGeneratedQuestion(p => ({ ...p, questionText: e.target.value }))} />
                    <p className="text-xs text-slate-400 mt-1">Edit before confirming if needed.</p>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => generateQuestion(currentSlotIdx)} className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">Regenerate</button>
                    <button onClick={confirmQuestion} className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition">Confirm & Next →</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4 */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-bold text-slate-800 mb-1">Review All Questions</h2>
              <p className="text-sm text-slate-500 mb-5">Edit any question before saving. KL and CO are auto-detected.</p>
              {['A', 'B', 'C'].map(part => {
                const partQs = confirmed.filter(q => q.part === part);
                if (!partQs.length) return null;
                const colors = { A: 'border-blue-400 bg-blue-50 text-blue-700', B: 'border-orange-400 bg-orange-50 text-orange-700', C: 'border-purple-400 bg-purple-50 text-purple-700' };
                return (
                  <div key={part} className="mb-6">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border mb-3 ${colors[part]}`}>
                      Part {part} — {partQs[0].marks} marks each
                    </div>
                    <div className="space-y-3">
                      {partQs.map((q, qi) => {
                        const globalIdx = confirmed.findIndex(c => c === q);
                        return (
                          <div key={qi} className="rounded-lg border border-slate-200 p-4">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-xs font-bold text-slate-500">Q{qi + 1}</span>
                              <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">{q.bloomLevel}</span>
                              <span className="px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">{q.suggestedCO}</span>
                            </div>
                            <textarea className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-400" rows={3}
                              value={q.questionText} onChange={e => editConfirmed(globalIdx, e.target.value)} />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setStep(3); setCurrentSlotIdx(slots.length - 1); }} className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm">← Back</button>
              <button onClick={savePaper} disabled={saving} className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition disabled:opacity-50">
                {saving ? 'Saving & Submitting...' : 'Save & Submit to Scrutinizer →'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
