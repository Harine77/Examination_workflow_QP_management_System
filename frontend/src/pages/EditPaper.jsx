import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/authContext';
import api from '../services/api';

const KL_LEVELS = ['K1', 'K2', 'K3', 'K4', 'K5'];

export default function EditPaper() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [paper, setPaper] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [courseOutcomes, setCourseOutcomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchPaper(); }, [id]);

  const fetchPaper = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/questions/papers/${id}`);
      const p = res.data.data;

      if (p.createdBy !== user.id) {
        toast.error('You can only edit your own papers');
        navigate(-1);
        return;
      }
      if (!['draft', 'needs_revision'].includes(p.status)) {
        toast.error('This paper cannot be edited at its current stage');
        navigate(-1);
        return;
      }

      setPaper(p);

      // Build editable questions list
      const qs = (p.Questions || []).sort((a, b) => {
        if (a.part !== b.part) return a.part.localeCompare(b.part);
        return a.questionNumber - b.questionNumber;
      });
      setQuestions(qs.map(q => ({
        id: q.id,
        part: q.part,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        marks: q.marks,
        klLevel: q.klLevel || 'K1',
        courseOutcomeId: q.CourseOutcomeId || q.courseOutcomeId || null,
        reviews: q.reviews || [],
      })));

      // Fetch course outcomes for CO dropdown
      if (p.CourseId || p.Course?.id) {
        const cRes = await api.get(`/courses/${p.CourseId || p.Course?.id}`);
        setCourseOutcomes(cRes.data.data?.CourseOutcomes || []);
      }
    } catch (err) {
      toast.error('Failed to load paper');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const updateQuestion = (idx, field, value) => {
    setQuestions(prev => prev.map((q, i) => i === idx ? { ...q, [field]: value } : q));
  };

  const handleSave = async (andSubmit = false) => {
    setSaving(true);
    try {
      const payload = questions.map(q => ({
        part: q.part,
        questionNumber: q.questionNumber,
        questionText: q.questionText,
        marks: q.marks,
        klLevel: q.klLevel,
        piIndicators: [],
        courseOutcomeId: q.courseOutcomeId || null,
      }));

      await api.post(`/questions/papers/${id}/questions`, { questions: payload });

      if (andSubmit) {
        await api.post(`/questions/papers/${id}/submit`);
        toast.success('Paper saved and submitted for review!');
        navigate('/papers');
      } else {
        toast.success('Paper saved as draft');
      }
    } catch (err) {
      toast.error('Failed to save: ' + (err.response?.data?.error || err.message));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />
      <div className="flex items-center justify-center py-20 text-slate-400">
        <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mr-3" />
        Loading paper...
      </div>
    </div>
  );

  if (!paper) return null;

  // Determine who sent it back
  const sentBackBy = paper.scrutinizer2Comments
    ? { role: 'Scrutinizer 2', name: paper.scrutinizer2?.username || 'Scrutinizer 2', comment: paper.scrutinizer2Comments, isCOKL: true }
    : paper.scrutinizer1Comments
    ? { role: 'Scrutinizer 1', name: paper.scrutinizer1?.username || 'Scrutinizer 1', comment: paper.scrutinizer1Comments, isCOKL: false }
    : paper.panelMemberComments
    ? { role: 'Panel Member', name: paper.panelMember?.username || 'Panel Member', comment: paper.panelMemberComments, isCOKL: false }
    : null;

  const partColors = { A: 'border-blue-400 bg-blue-50 text-blue-700', B: 'border-orange-400 bg-orange-50 text-orange-700', C: 'border-purple-400 bg-purple-50 text-purple-700' };

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate(-1)} className="text-slate-500 hover:text-slate-800 text-sm font-medium transition">← Back</button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Edit Paper</h1>
            <p className="text-sm text-slate-500 mt-0.5">{paper.Course?.courseCode} — {paper.Course?.courseName} · {paper.examType} {paper.catNumber || ''}</p>
          </div>
        </div>

        {/* Revision remarks banner */}
        {sentBackBy && (
          <div className="mb-6 rounded-xl border-2 border-red-300 bg-red-50 p-5">
            <div className="flex items-start gap-3">
              <span className="text-2xl">⚠️</span>
              <div className="flex-1">
                <div className="font-bold text-red-800 text-base mb-1">
                  Paper sent back by {sentBackBy.role}
                  {sentBackBy.name !== sentBackBy.role ? ` (${sentBackBy.name})` : ''}
                </div>
                <div className="text-red-700 text-sm mb-3 bg-white rounded-lg px-3 py-2 border border-red-200">
                  {sentBackBy.comment}
                </div>
                {sentBackBy.isCOKL && (
                  <div className="rounded-lg bg-amber-50 border border-amber-300 px-3 py-2 text-sm text-amber-800">
                    <span className="font-bold">CO/KL Mapping Issue:</span> Scrutinizer 2 has flagged incorrect CO or KL mappings.
                    Please review the KL Level and Course Outcome for each question marked below.
                  </div>
                )}
                {paper.revisionCount > 0 && (
                  <div className="mt-2 text-xs text-red-500">Revision #{paper.revisionCount}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Per-question issues from scrutinizer reviews */}
        {questions.some(q => q.reviews?.length > 0) && (
          <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
            <div className="font-semibold text-amber-800 mb-2 text-sm">Question-level feedback from scrutinizers:</div>
            <div className="space-y-2">
              {questions.filter(q => q.reviews?.some(r => r.status === 'SUGGESTED')).map(q => (
                q.reviews.filter(r => r.status === 'SUGGESTED').map((r, ri) => (
                  <div key={`${q.id}-${ri}`} className="flex gap-2 text-sm">
                    <span className="font-bold text-amber-700 whitespace-nowrap">Part {q.part} Q{q.questionNumber}:</span>
                    <span className="text-amber-800">{r.suggestion_text || 'Needs revision'}</span>
                    <span className="text-amber-500 text-xs ml-auto whitespace-nowrap">{r.reviewer_role === 'scrutinizer_2' ? 'S2' : 'S1'}</span>
                  </div>
                ))
              ))}
            </div>
          </div>
        )}

        {/* Questions editor */}
        {['A', 'B', 'C'].map(part => {
          const partQs = questions.filter(q => q.part === part);
          if (!partQs.length) return null;
          return (
            <div key={part} className="mb-8">
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border mb-4 ${partColors[part]}`}>
                Part {part} — {partQs[0].marks} marks each
              </div>
              <div className="space-y-4">
                {partQs.map(q => {
                  const globalIdx = questions.findIndex(x => x.id === q.id);
                  const hasSuggestion = q.reviews?.some(r => r.status === 'SUGGESTED');
                  const suggestion = q.reviews?.find(r => r.status === 'SUGGESTED');
                  const isS2Issue = suggestion?.reviewer_role === 'scrutinizer_2';

                  return (
                    <div key={q.id} className={`rounded-xl border-2 p-5 space-y-3 ${hasSuggestion ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-white'}`}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-500">Q{q.questionNumber}</span>
                        {hasSuggestion && (
                          <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                            ⚠ Needs revision {isS2Issue ? '(CO/KL issue)' : ''}
                          </span>
                        )}
                        {suggestion && (
                          <span className="text-xs text-red-600 italic">{suggestion.suggestion_text}</span>
                        )}
                      </div>

                      {/* Question text */}
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 mb-1 uppercase tracking-wide">Question</label>
                        <textarea
                          className={`w-full border rounded-lg p-3 text-sm resize-none focus:outline-none focus:ring-2 ${hasSuggestion ? 'border-red-300 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`}
                          rows={3}
                          value={q.questionText}
                          onChange={e => updateQuestion(globalIdx, 'questionText', e.target.value)}
                        />
                      </div>

                      {/* KL + CO row */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className={`block text-xs font-semibold mb-1 uppercase tracking-wide ${isS2Issue ? 'text-red-600' : 'text-slate-600'}`}>
                            KL Level {isS2Issue && '⚠'}
                          </label>
                          <select
                            className={`w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 ${isS2Issue ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`}
                            value={q.klLevel}
                            onChange={e => updateQuestion(globalIdx, 'klLevel', e.target.value)}
                          >
                            {KL_LEVELS.map(k => <option key={k} value={k}>{k}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={`block text-xs font-semibold mb-1 uppercase tracking-wide ${isS2Issue ? 'text-red-600' : 'text-slate-600'}`}>
                            Course Outcome {isS2Issue && '⚠'}
                          </label>
                          <select
                            className={`w-full border rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 ${isS2Issue ? 'border-red-300 bg-red-50 focus:border-red-400 focus:ring-red-100' : 'border-slate-200 focus:border-blue-400 focus:ring-blue-100'}`}
                            value={q.courseOutcomeId || ''}
                            onChange={e => updateQuestion(globalIdx, 'courseOutcomeId', e.target.value ? parseInt(e.target.value) : null)}
                          >
                            <option value="">— Select CO —</option>
                            {courseOutcomes.map(co => (
                              <option key={co.id} value={co.id}>{co.coNumber}: {co.description?.slice(0, 50)}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Action buttons */}
        <div className="flex gap-3 pt-4">
          <button onClick={() => handleSave(false)} disabled={saving}
            className="px-6 py-2.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition disabled:opacity-50">
            Save Draft
          </button>
          <button onClick={() => handleSave(true)} disabled={saving}
            className="flex-1 py-2.5 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition disabled:opacity-50">
            {saving ? 'Saving...' : 'Save & Submit for Review →'}
          </button>
        </div>
      </div>
    </div>
  );
}
