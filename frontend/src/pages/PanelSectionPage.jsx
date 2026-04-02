import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import api from '../services/api';

// Reusable panel section page — pass sectionKey and config as props
const PanelSectionPage = ({ title, description, sectionKey, accentColor, backPath }) => {
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [busy, setBusy] = useState({});

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/hod/panel/overview');
      if (res.data.success) {
        setPapers(res.data[sectionKey] || []);
      }
    } catch (err) {
      console.error('Failed to fetch papers:', err);
    } finally {
      setLoading(false);
    }
  }, [sectionKey]);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  const setBusyState = (id, state) => setBusy((p) => ({ ...p, [id]: state }));

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
      // Step 1: fetch full paper with questions first
      const paperRes = await api.get(`/questions/papers/${paperId}`);
      const paper = paperRes.data.data;
      const questions = (paper.Questions || []).sort((a, b) => {
        if (a.part !== b.part) return a.part.localeCompare(b.part);
        return a.questionNumber - b.questionNumber;
      });

      if (!questions.length) {
        alert('No questions found in this paper. Cannot generate answer key.');
        return;
      }

      const OLLAMA_URL = import.meta.env.VITE_OLLAMA_URL || 'http://127.0.0.1:11434';
      const OLLAMA_MODEL = import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2:1b';

      // Step 2: generate answer key for each question
      const items = [];
      for (let i = 0; i < questions.length; i++) {
        const q = questions[i];
        setBusyState(paperId, `Generating answer key ${i + 1}/${questions.length}...`);

        const depthHint = q.marks <= 2
          ? 'Very concise — 1 to 3 sentences only.'
          : q.marks <= 6
          ? 'Structured answer with 3-5 key points.'
          : 'Detailed answer with explanation, steps, and examples.';

        const prompt = `You are an exam answer key generator. Return ONLY valid JSON, no extra text.\nQuestion: ${q.questionText}\nMarks: ${q.marks} | Part: ${q.part} | Q${q.questionNumber}\n${depthHint}\nReturn exactly this JSON:\n{"part":"${q.part}","questionNumber":${q.questionNumber},"marks":${q.marks},"answerKey":"write the model answer here","keyPoints":["key point 1","key point 2"],"markingScheme":["marking step 1","marking step 2"]}`;

        try {
          const ollamaRes = await fetch(`${OLLAMA_URL}/api/generate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              model: OLLAMA_MODEL,
              prompt,
              stream: false,
              format: 'json',
              options: { temperature: 0.2 },
            }),
          });

          if (!ollamaRes.ok) throw new Error(`Ollama HTTP ${ollamaRes.status}`);

          const data = await ollamaRes.json();
          const raw = (data.response || '').trim();

          let parsed = null;
          try {
            parsed = JSON.parse(raw);
          } catch {
            const f = raw.indexOf('{');
            const l = raw.lastIndexOf('}');
            if (f !== -1 && l !== -1) {
              try { parsed = JSON.parse(raw.slice(f, l + 1)); } catch { /* ignore */ }
            }
          }

          if (parsed && parsed.answerKey) {
            items.push(parsed);
          } else {
            items.push({
              part: q.part, questionNumber: q.questionNumber, marks: q.marks,
              answerKey: raw || '(generation failed)', keyPoints: [], markingScheme: [],
            });
          }
        } catch (ollamaErr) {
          console.error(`Ollama failed for Q${q.questionNumber}:`, ollamaErr);
          items.push({
            part: q.part, questionNumber: q.questionNumber, marks: q.marks,
            answerKey: `(failed: ${ollamaErr.message})`, keyPoints: [], markingScheme: [],
          });
        }
      }

      // Step 3: update paper status + save answer key together
      await api.post(`/hod/panel/papers/${paperId}/return-to-faculties-simple`, {
        comments: comments[paperId] || '',
      });

      await api.post(`/hod/panel/papers/${paperId}/save-answer-key`, {
        answerKey: {
          overview: `Answer key for ${paper.Course?.courseCode || 'paper'} — ${questions.length} questions`,
          items,
        },
        model: OLLAMA_MODEL,
      });

      alert(`Paper returned to faculties with answer key (${items.length} questions)`);
      fetchPapers();
    } catch (err) {
      console.error('handleReturn error:', err);
      alert('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setBusyState(paperId, null);
    }
  };

  const canSubmit = (paper) => paper.status === 'with_panel';
  const canReturn = (paper) => ['with_panel', 'with_hod', 'hod_approved'].includes(paper.status);
  const isActionable = sectionKey === 'pendingReview' || sectionKey === 'hodApproved';

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate(backPath || '/panel-dashboard')}
            className="text-slate-500 hover:text-slate-800 text-sm font-medium transition">
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
            <p className="text-sm text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className={`w-10 h-10 border-4 ${accentColor || 'border-blue-400'} border-t-transparent rounded-full animate-spin mb-3`} />
            <p>Loading papers...</p>
          </div>
        ) : papers.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-16 text-center">
            <p className="text-lg font-semibold text-slate-700">No papers here</p>
            <p className="text-sm text-slate-400 mt-1">Nothing in this stage right now.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {papers.map((paper) => (
              <div key={paper.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Card header */}
                <div className="bg-slate-900 text-white px-5 py-4 border-b-2 border-blue-500">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-base">{paper.courseCode} — {paper.examType} {paper.catNumber || ''}</h3>
                    {paper.isShuffled && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-400 text-green-900">Shuffled</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{paper.courseName} · {paper.createdBy}</p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Question counts */}
                  <div className="grid grid-cols-3 gap-2 text-center text-sm">
                    <div className="bg-blue-50 rounded-lg p-2.5">
                      <div className="font-bold text-blue-700">{paper.sections?.['2M']?.length || 0}</div>
                      <div className="text-slate-500 text-xs">2-Mark</div>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-2.5">
                      <div className="font-bold text-orange-700">{paper.sections?.['6M']?.length || 0}</div>
                      <div className="text-slate-500 text-xs">6-Mark</div>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2.5">
                      <div className="font-bold text-purple-700">{paper.sections?.['12M']?.length || 0}</div>
                      <div className="text-slate-500 text-xs">12-Mark</div>
                    </div>
                  </div>

                  {/* Comments from previous stages */}
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

                  {/* Comment input for actionable sections */}
                  {isActionable && (
                    <textarea
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      rows={2}
                      placeholder="Add comments (optional)..."
                      value={comments[paper.id] || ''}
                      onChange={(e) => setComments((p) => ({ ...p, [paper.id]: e.target.value }))}
                    />
                  )}

                  {/* Action buttons */}
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => navigate(`/papers/${paper.id}`)}
                      className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">
                      View
                    </button>
                    <button
                      onClick={async () => {
                        try {
                          const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                          const res = await fetch(`${import.meta.env.VITE_API_URL}/pdf/paper/${paper.id}`, {
                            headers: { Authorization: `Bearer ${token}` },
                          });
                          if (!res.ok) throw new Error('Failed');
                          const blob = await res.blob();
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url; a.download = `${paper.courseCode}_${paper.examType}.pdf`;
                          a.click(); URL.revokeObjectURL(url);
                        } catch { alert('PDF generation failed'); }
                      }}
                      className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-semibold text-sm transition"
                    >
                      Download QP
                    </button>
                    {/* Answer Key download — only for returned papers */}
                    {sectionKey === 'returnedToFaculties' && (
                      <button
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token') || sessionStorage.getItem('token');
                            const res = await fetch(`${import.meta.env.VITE_API_URL}/pdf/answer-key/${paper.id}`, {
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            if (!res.ok) {
                              const err = await res.json().catch(() => ({}));
                              throw new Error(err.error || 'Failed');
                            }
                            const blob = await res.blob();
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url; a.download = `${paper.courseCode}_AnswerKey.pdf`;
                            a.click(); URL.revokeObjectURL(url);
                          } catch (e) { alert('Answer key PDF failed: ' + e.message); }
                        }}
                        className="flex-1 py-2 rounded-lg bg-teal-700 hover:bg-teal-800 text-white font-semibold text-sm transition"
                      >
                        Download Answer Key
                      </button>
                    )}
                    {isActionable && canSubmit(paper) && (
                      <button onClick={() => handleSubmit(paper.id)} disabled={busy[paper.id] === 'submit'}
                        className="flex-1 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition disabled:opacity-50">
                        {busy[paper.id] === 'submit' ? 'Submitting...' : 'Submit to HOD'}
                      </button>
                    )}
                    {isActionable && canReturn(paper) && (
                      <button onClick={() => handleReturn(paper.id)} disabled={!!busy[paper.id]}
                        className="flex-1 py-2 rounded-lg bg-teal-600 hover:bg-teal-700 text-white font-semibold text-sm transition disabled:opacity-60">
                        {busy[paper.id] === 'return' || (typeof busy[paper.id] === 'string' && busy[paper.id].startsWith('Generating'))
                          ? (typeof busy[paper.id] === 'string' && busy[paper.id].startsWith('Generating') ? busy[paper.id] : 'Processing...')
                          : 'Return to Faculties'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PanelSectionPage;
