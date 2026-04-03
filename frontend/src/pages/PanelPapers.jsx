import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

const STATUS_SECTIONS = [
  { key: 'pendingReview',        label: 'Awaiting Review',        desc: 'Papers with both panel actions available.' },
  { key: 'submittedToHod',       label: 'Submitted to HOD',       desc: 'Already forwarded to HOD.' },
  { key: 'hodApproved',          label: 'HOD Approved',           desc: 'Approved — can still be returned to faculties.' },
  { key: 'returnedToFaculties',  label: 'Returned to Faculties',  desc: 'Finalized papers returned with answer keys.' },
];

const PanelPapers = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [busy, setBusy] = useState({});
  const [overview, setOverview] = useState({
    pendingReview: [], submittedToHod: [], returnedToFaculties: [], hodApproved: [],
  });

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/hod/panel/overview');
      if (res.data.success) {
        setOverview({
          pendingReview: res.data.pendingReview || [],
          submittedToHod: res.data.submittedToHod || [],
          returnedToFaculties: res.data.returnedToFaculties || [],
          hodApproved: res.data.hodApproved || [],
        });
      }
    } catch (err) {
      console.error('Failed to fetch panel overview:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOverview(); }, [fetchOverview]);

  const setBusyState = (id, state) => setBusy((p) => ({ ...p, [id]: state }));

  const handleSubmit = async (paperId) => {
    setBusyState(paperId, 'submit');
    try {
      const res = await api.post(`/hod/panel/papers/${paperId}/submit`, { comments: comments[paperId] || '' });
      if (res.data.success) { alert('Paper submitted to HOD'); fetchOverview(); }
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setBusyState(paperId, null);
    }
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
      const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:1b';
      const items = [];

      for (const q of questions) {
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
      fetchOverview();
    } catch (err) {
      alert('Failed to return paper: ' + (err.response?.data?.error || err.message));
    } finally {
      setBusyState(paperId, null);
    }
  };

  const PaperCard = ({ paper, sectionKey }) => {
    const canSubmit = paper.status === 'with_panel';
    const canReturn = ['with_panel', 'with_hod', 'hod_approved'].includes(paper.status);
    const isActionable = sectionKey === 'pendingReview' || sectionKey === 'hodApproved';

    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-4 border-b-2 border-blue-500">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-base">{paper.courseCode} — {paper.examType} {paper.catNumber || ''}</h3>
            {paper.isShuffled && <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-400 text-green-900">Shuffled</span>}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">{paper.courseName} · Created by {paper.createdBy}</p>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-3 gap-3 text-center text-sm">
            <div className="bg-blue-50 rounded-lg p-3">
              <div className="font-bold text-blue-700">{paper.sections?.['2M']?.length || 0}</div>
              <div className="text-slate-500 text-xs">2-Mark</div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <div className="font-bold text-orange-700">{paper.sections?.['6M']?.length || 0}</div>
              <div className="text-slate-500 text-xs">6-Mark</div>
            </div>
            <div className="bg-purple-50 rounded-lg p-3">
              <div className="font-bold text-purple-700">{paper.sections?.['12M']?.length || 0}</div>
              <div className="text-slate-500 text-xs">12-Mark</div>
            </div>
          </div>

          {paper.scrutinizer2Comments && (
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-3 py-2 text-sm text-slate-700">
              <span className="font-semibold">Scrutinizer 2:</span> {paper.scrutinizer2Comments}
            </div>
          )}
          {paper.hodComments && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 px-3 py-2 text-sm text-purple-900">
              <span className="font-semibold">HOD:</span> {paper.hodComments}
            </div>
          )}

          {isActionable && (
            <textarea
              className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              rows={2}
              placeholder="Add comments (optional)..."
              value={comments[paper.id] || ''}
              onChange={(e) => setComments((p) => ({ ...p, [paper.id]: e.target.value }))}
            />
          )}

          <div className="flex gap-2">
            <button onClick={() => navigate(`/papers/${paper.id}`)}
              className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">
              View
            </button>
            {isActionable && canSubmit && (
              <button onClick={() => handleSubmit(paper.id)} disabled={busy[paper.id] === 'submit'}
                className="flex-1 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition disabled:opacity-50">
                {busy[paper.id] === 'submit' ? 'Submitting...' : 'Submit to HOD'}
              </button>
            )}
            {isActionable && canReturn && (
              <button onClick={() => handleReturn(paper.id)} disabled={busy[paper.id] === 'return'}
                className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition disabled:opacity-50">
                {busy[paper.id] === 'return' ? 'Generating...' : 'Return to Faculties'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/panel-dashboard')}
            className="text-slate-500 hover:text-slate-800 text-sm font-medium transition">
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Papers for Review</h1>
            <p className="text-sm text-slate-500 mt-0.5">Manage papers across all panel stages</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p>Loading papers...</p>
          </div>
        ) : (
          STATUS_SECTIONS.map(({ key, label, desc }) => {
            const papers = overview[key] || [];
            return (
              <section key={key} className="mb-10">
                <div className="flex items-end justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">{label}</h2>
                    <p className="text-sm text-slate-500">{desc}</p>
                  </div>
                  <span className="text-sm text-slate-400">{papers.length} paper{papers.length !== 1 ? 's' : ''}</span>
                </div>
                {papers.length === 0 ? (
                  <div className="rounded-xl border-2 border-dashed border-slate-200 bg-white p-8 text-center text-slate-400 text-sm">
                    No papers here right now.
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {papers.map((paper) => <PaperCard key={paper.id} paper={paper} sectionKey={key} />)}
                  </div>
                )}
              </section>
            );
          })
        )}
      </div>
    </div>
  );
};

export default PanelPapers;
