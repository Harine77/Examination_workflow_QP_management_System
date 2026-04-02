import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/authContext';
import api from '../services/api';

const STATUS_META = {
  draft:                 { color: 'bg-slate-500',   text: 'Draft' },
  submitted:             { color: 'bg-blue-500',    text: 'Submitted' },
  with_scrutinizer1:     { color: 'bg-blue-600',    text: 'With Scrutinizer 1' },
  with_scrutinizer2:     { color: 'bg-violet-600',  text: 'With Scrutinizer 2' },
  needs_revision:        { color: 'bg-red-500',     text: 'Needs Revision' },
  scrutinizer2_approved: { color: 'bg-emerald-600', text: 'S2 Approved' },
  randomized:            { color: 'bg-amber-500',   text: 'Randomized' },
  with_panel:            { color: 'bg-cyan-600',    text: 'With Panel' },
  returned_to_faculties: { color: 'bg-teal-600',    text: 'Returned to Faculties' },
  with_hod:              { color: 'bg-purple-600',  text: 'With HOD' },
  hod_approved:          { color: 'bg-green-600',   text: 'HOD Approved' },
  reviewed:              { color: 'bg-green-500',   text: 'Reviewed' },
  finalized:             { color: 'bg-purple-500',  text: 'Finalized' },
};

const CATEGORIES = [
  { key: 'CAT-I',  label: 'CAT I',  examType: 'CAT', catNumber: 'I',  color: 'bg-blue-700 hover:bg-blue-800',    border: 'border-blue-500' },
  { key: 'CAT-II', label: 'CAT II', examType: 'CAT', catNumber: 'II', color: 'bg-indigo-700 hover:bg-indigo-800', border: 'border-indigo-500' },
  { key: 'SAT',    label: 'SAT',    examType: 'SAT', catNumber: null, color: 'bg-teal-700 hover:bg-teal-800',     border: 'border-teal-500' },
  { key: 'SEM',    label: 'SEM',    examType: 'SEM', catNumber: null, color: 'bg-purple-700 hover:bg-purple-800', border: 'border-purple-500' },
];

const FACULTY_SEEN_KEY = 'faculty_seen_papers';

function matchCategory(paper, cat) {
  if (paper.examType !== cat.examType) return false;
  if (cat.catNumber) return paper.catNumber === cat.catNumber;
  if (cat.examType === 'CAT') return false;
  return true;
}

const BACK_PATH = {
  faculty: '/dashboard',
  scrutinizer: '/scrutinizer', scrutinizer_1: '/scrutinizer', scrutinizer_2: '/scrutinizer',
  panel_member: '/panel-dashboard', panel: '/panel-dashboard',
  hod: '/hod-dashboard',
};

const QuestionPapers = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState(null);
  const [seenIds, setSeenIds] = useState(() => {
    try { return new Set(JSON.parse(localStorage.getItem(FACULTY_SEEN_KEY) || '[]')); }
    catch { return new Set(); }
  });
  const { user } = useAuth();
  const navigate = useNavigate();
  const isFaculty = user.role === 'faculty';
  const backPath = BACK_PATH[user.role] || '/dashboard';

  useEffect(() => { fetchPapers(); }, []);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/questions/papers');
      setPapers(res.data.data || []);
    } catch {
      toast.error('Failed to fetch papers');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (paperId) => {
    if (!window.confirm('Submit this paper for review?')) return;
    try {
      await api.post(`/questions/papers/${paperId}/submit`);
      toast.success('Paper submitted!');
      fetchPapers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit');
    }
  };

  const markSeen = (catKey) => {
    const cat = CATEGORIES.find(c => c.key === catKey);
    const ids = papers.filter(p => matchCategory(p, cat)).map(p => p.id);
    const newSeen = new Set([...seenIds, ...ids]);
    setSeenIds(newSeen);
    localStorage.setItem(FACULTY_SEEN_KEY, JSON.stringify([...newSeen]));
  };

  const handleSelectCat = (catKey) => {
    setSelectedCat(catKey);
    markSeen(catKey);
  };

  const hasNew = (catKey) => {
    const cat = CATEGORIES.find(c => c.key === catKey);
    return papers.filter(p => matchCategory(p, cat)).some(p => !seenIds.has(p.id));
  };

  const selectedCatObj = CATEGORIES.find(c => c.key === selectedCat);
  const filteredPapers = selectedCat ? papers.filter(p => matchCategory(p, selectedCatObj)) : [];

  // For non-faculty roles, show flat list (no category filter)
  if (!isFaculty) {
    return (
      <div className="min-h-screen dashboard-bg">
        <Navbar />
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="flex items-center gap-4 mb-8">
            <button onClick={() => navigate(backPath)} className="text-slate-500 hover:text-slate-800 text-sm font-medium transition">← Back</button>
            <h1 className="text-2xl font-bold text-slate-900">Question Papers</h1>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p>Loading...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {papers.map(paper => (
                <PaperCard key={paper.id} paper={paper} user={user} onSubmit={handleSubmit} onView={() => navigate(`/papers/${paper.id}`)} borderColor="border-blue-500" />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => selectedCat ? setSelectedCat(null) : navigate(backPath)}
            className="text-slate-500 hover:text-slate-800 text-sm font-medium transition">← Back</button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {selectedCat ? `${selectedCatObj?.label} Papers` : 'My Papers'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {selectedCat ? `${filteredPapers.length} paper${filteredPapers.length !== 1 ? 's' : ''}` : 'Select a category'}
            </p>
          </div>
          {!selectedCat && (
            <button onClick={() => navigate('/ai-create-paper')}
              className="ml-auto bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg font-semibold text-sm transition">
              + New Paper
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p>Loading...</p>
          </div>
        ) : !selectedCat ? (
          /* Category grid */
          <div className="grid grid-cols-2 gap-5">
            {CATEGORIES.map(cat => {
              const count = papers.filter(p => matchCategory(p, cat)).length;
              const isNew = hasNew(cat.key);
              return (
                <button key={cat.key} onClick={() => handleSelectCat(cat.key)}
                  className={`${cat.color} text-white rounded-xl p-8 text-left shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 relative`}>
                  {isNew && <span className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full ring-2 ring-white" />}
                  <div className="text-3xl font-bold mb-1">{cat.label}</div>
                  <div className="text-sm opacity-80">{count > 0 ? `${count} paper${count !== 1 ? 's' : ''}` : 'No papers yet'}</div>
                  {count > 0 && <div className="mt-3 inline-flex bg-white/20 rounded-full px-3 py-1 text-xs font-bold">{count} papers</div>}
                </button>
              );
            })}
          </div>
        ) : filteredPapers.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-16 text-center">
            <p className="text-lg font-semibold text-slate-700">No {selectedCatObj?.label} papers yet</p>
            <button onClick={() => navigate('/ai-create-paper')}
              className="mt-4 bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded-lg font-semibold text-sm transition">
              Create One
            </button>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredPapers.map(paper => (
              <PaperCard key={paper.id} paper={paper} user={user} onSubmit={handleSubmit}
                onView={() => navigate(`/papers/${paper.id}`)} borderColor={selectedCatObj?.border} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

function PaperCard({ paper, user, onSubmit, onView, borderColor }) {
  const navigate = useNavigate();
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className={`bg-slate-900 text-white px-5 py-3 border-b-2 ${borderColor || 'border-blue-500'}`}>
        <div className="flex items-center gap-3 flex-wrap">
          <h3 className="font-bold text-base">{paper.Course?.courseCode} — {paper.Course?.courseName}</h3>
          <span className={`${STATUS_META[paper.status]?.color || 'bg-slate-500'} text-white px-2.5 py-0.5 rounded-full text-xs font-bold`}>
            {STATUS_META[paper.status]?.text || paper.status}
          </span>
          {paper.catNumber && <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-white/10">{paper.examType} {paper.catNumber}</span>}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {paper.examType}{paper.catNumber ? ` — ${paper.catNumber}` : ''} · {new Date(paper.createdAt).toLocaleDateString()}
        </p>
      </div>
      <div className="px-5 py-4">
        {paper.status === 'needs_revision' && (
          <div className="mb-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-800">
            Sent back for revision. Please review and resubmit.
          </div>
        )}
        {paper.status === 'returned_to_faculties' && (
          <div className="mb-3 rounded-lg bg-teal-50 border border-teal-200 px-3 py-2 text-sm text-teal-800">
            Finalized paper returned to faculties.{paper.answerKeyGeneratedAt ? ' Answer key available.' : ''}
          </div>
        )}
        <div className="flex gap-2">
          <button onClick={onView} className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">View</button>
          {user.role === 'faculty' && paper.status === 'draft' && (
            <button onClick={() => onSubmit(paper.id)} className="flex-1 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition">Submit</button>
          )}
          {user.role === 'faculty' && paper.status === 'needs_revision' && (
            <button onClick={() => navigate(`/papers/${paper.id}/edit`)} className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition">Edit & Resubmit</button>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuestionPapers;
