import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

const SEEN_KEY = 'panel_seen_papers';

const CATEGORIES = [
  { key: 'CAT-I',  label: 'CAT I',  examType: 'CAT', catNumber: 'I',   color: 'bg-blue-700 hover:bg-blue-800',   border: 'border-blue-500' },
  { key: 'CAT-II', label: 'CAT II', examType: 'CAT', catNumber: 'II',  color: 'bg-indigo-700 hover:bg-indigo-800', border: 'border-indigo-500' },
  { key: 'SAT',    label: 'SAT',    examType: 'SAT', catNumber: null,  color: 'bg-teal-700 hover:bg-teal-800',    border: 'border-teal-500' },
  { key: 'SEM',    label: 'SEM',    examType: 'SEM', catNumber: null,  color: 'bg-purple-700 hover:bg-purple-800', border: 'border-purple-500' },
];

function matchCategory(paper, cat) {
  if (paper.examType !== cat.examType) return false;
  if (cat.catNumber && paper.catNumber !== cat.catNumber) return false;
  if (!cat.catNumber && cat.examType !== 'CAT' && paper.examType === cat.examType) return true;
  if (!cat.catNumber && cat.examType === 'CAT') return false;
  return true;
}

export default function PanelAwaitingReview() {
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null); // selected category key
  const [comments, setComments] = useState({});
  const [busy, setBusy] = useState({});

  // Track seen paper IDs to show red dot for new ones
  const [seenIds, setSeenIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')); }
    catch { return new Set(); }
  });

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/hod/panel/overview');
      if (res.data.success) setPapers(res.data.pendingReview || []);
    } catch (err) {
      console.error('Failed to fetch papers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  const markSeen = (catKey) => {
    const catPapers = papers.filter(p => matchCategory(p, CATEGORIES.find(c => c.key === catKey)));
    const newSeen = new Set([...seenIds, ...catPapers.map(p => p.id)]);
    setSeenIds(newSeen);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...newSeen]));
  };

  const handleSelectCategory = (catKey) => {
    setSelected(catKey);
    markSeen(catKey);
  };

  const setBusyState = (id, state) => setBusy(p => ({ ...p, [id]: state }));

  const handleSubmit = async (paperId) => {
    setBusyState(paperId, 'submit');
    try {
      const res = await api.post(`/hod/panel/papers/${paperId}/submit`, { comments: comments[paperId] || '' });
      if (res.data.success) { alert('Paper submitted to HOD'); fetchPapers(); }
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    } finally { setBusyState(paperId, null); }
  };

  const handleReturn = async (paperId) => {
    setBusyState(paperId, 'return');
    try {
      const res = await api.post(`/hod/panel/papers/${paperId}/return-to-faculties-simple`, { comments: comments[paperId] || '' });
      if (!res.data.success) throw new Error(res.data.error);

      const paperRes = await api.get(`/questions/papers/${paperId}`);
      const paper = paperRes.data.data;
      const questions = (paper.Questions || []).sort((a, b) => a.part.localeCompare(b.part) || a.questionNumber - b.questionNumber);

      const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://127.0.0.1:11434';
      const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:3b';
      const items = [];

      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        setBusyState(paperId, `Generating answer key ${i + 1}/${questions.length}...`);
        const depthHint = q.marks <= 2 ? 'Very concise — 1 to 3 sentences.' : q.marks <= 6 ? '3-5 key points.' : 'Detailed with steps and examples.';
        const prompt = `Generate answer key. Return ONLY JSON.\nQuestion: ${q.questionText}\nMarks: ${q.marks} Part: ${q.part} Q${q.questionNumber}\n${depthHint}\n{"part":"${q.part}","questionNumber":${q.questionNumber},"marks":${q.marks},"answerKey":"answer","keyPoints":["p1"],"markingScheme":["s1"]}`;
        try {
          const r = await fetch(`${OLLAMA_URL}/api/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: OLLAMA_MODEL, prompt, stream: false, format: 'json', options: { temperature: 0.2 } }) });
          const d = await r.json();
          let parsed; try { parsed = JSON.parse(d.response || ''); } catch { const f = (d.response||'').indexOf('{'), l = (d.response||'').lastIndexOf('}'); parsed = f !== -1 ? JSON.parse((d.response||'').slice(f, l+1)) : null; }
          items.push(parsed?.answerKey ? parsed : { part: q.part, questionNumber: q.questionNumber, marks: q.marks, answerKey: '(not generated)', keyPoints: [], markingScheme: [] });
        } catch (_) { items.push({ part: q.part, questionNumber: q.questionNumber, marks: q.marks, answerKey: '(failed)', keyPoints: [], markingScheme: [] }); }
      }

      await api.post(`/hod/panel/papers/${paperId}/save-answer-key`, { answerKey: { overview: `Answer key for ${paper.Course?.courseCode || 'paper'}`, items }, model: OLLAMA_MODEL });
      alert('Paper returned to faculties with answer key');
      fetchPapers();
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    } finally { setBusyState(paperId, null); }
  };

  const selectedCat = CATEGORIES.find(c => c.key === selected);
  const filteredPapers = selected ? papers.filter(p => matchCategory(p, selectedCat)) : [];

  const hasNew = (catKey) => {
    const cat = CATEGORIES.find(c => c.key === catKey);
    return papers.filter(p => matchCategory(p, cat)).some(p => !seenIds.has(p.id));
  };

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => selected ? setSelected(null) : navigate('/panel-dashboard')}
            className="text-slate-500 hover:text-slate-800 text-sm font-medium transition">
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {selected ? `${selectedCat?.label} Papers` : 'Awaiting Review'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {selected ? `${filteredPapers.length} paper${filteredPapers.length !== 1 ? 's' : ''}` : 'Select a category to view papers'}
            </p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p>Loading papers...</p>
          </div>
        ) : !selected ? (
          /* Category selection grid */
          <div className="grid grid-cols-2 gap-5">
            {CATEGORIES.map(cat => {
              const count = papers.filter(p => matchCategory(p, cat)).length;
              const isNew = hasNew(cat.key);
              return (
                <button key={cat.key} onClick={() => handleSelectCategory(cat.key)}
                  className={`${cat.color} text-white rounded-xl p-8 text-left shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 relative`}>
                  {/* Red dot for new papers */}
                  {isNew && (
                    <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full ring-2 ring-white" />
                  )}
                  <div className="text-3xl font-bold mb-1">{cat.label}</div>
                  <div className="text-sm opacity-80">
                    {count > 0 ? `${count} paper${count !== 1 ? 's' : ''} awaiting review` : 'No papers'}
                  </div>
                  {count > 0 && (
                    <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1 text-xs font-bold">
                      {count} pending
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          /* Papers list for selected category */
          filteredPapers.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-16 text-center">
              <p className="text-lg font-semibold text-slate-700">No {selectedCat?.label} papers</p>
              <p className="text-sm text-slate-400 mt-1">No papers in this category right now.</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2">
              {filteredPapers.map(paper => (
                <div key={paper.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className={`bg-slate-900 text-white px-5 py-4 border-b-2 ${selectedCat?.border}`}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base">{paper.courseCode} — {paper.examType} {paper.catNumber || ''}</h3>
                      {paper.isShuffled && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-400 text-green-900">Shuffled</span>}
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">{paper.courseName} · {paper.createdBy}</p>
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="grid grid-cols-3 gap-2 text-center text-sm">
                      <div className="bg-blue-50 rounded-lg p-2.5"><div className="font-bold text-blue-700">{paper.sections?.['2M']?.length || 0}</div><div className="text-slate-500 text-xs">2-Mark</div></div>
                      <div className="bg-orange-50 rounded-lg p-2.5"><div className="font-bold text-orange-700">{paper.sections?.['6M']?.length || 0}</div><div className="text-slate-500 text-xs">6-Mark</div></div>
                      <div className="bg-purple-50 rounded-lg p-2.5"><div className="font-bold text-purple-700">{paper.sections?.['12M']?.length || 0}</div><div className="text-slate-500 text-xs">12-Mark</div></div>
                    </div>

                    {paper.scrutinizer2Comments && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">
                        <span className="font-semibold">Scrutinizer 2:</span> {paper.scrutinizer2Comments}
                      </div>
                    )}

                    <textarea
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      rows={2} placeholder="Add comments (optional)..."
                      value={comments[paper.id] || ''}
                      onChange={e => setComments(p => ({ ...p, [paper.id]: e.target.value }))}
                    />

                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/papers/${paper.id}`)}
                        className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">
                        View
                      </button>
                      <button onClick={() => handleSubmit(paper.id)} disabled={busy[paper.id] === 'submit'}
                        className="flex-1 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition disabled:opacity-50">
                        {busy[paper.id] === 'submit' ? 'Submitting...' : 'Submit to HOD'}
                      </button>
                      <button onClick={() => handleReturn(paper.id)} disabled={!!busy[paper.id]}
                        className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition disabled:opacity-60">
                        {typeof busy[paper.id] === 'string' && busy[paper.id].startsWith('Generating')
                          ? busy[paper.id] : busy[paper.id] ? 'Processing...' : 'Return to Faculties'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
}
