import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const PanelDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ withPanel: 0, submitted: 0 });
  const [comments, setComments] = useState({});
  const [submitting, setSubmitting] = useState(null);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const [papersRes, statusRes] = await Promise.all([
        api.get('/hod/panel/papers').catch(() => null),
        api.get('/hod/panel/status').catch(() => null),
      ]);
      if (papersRes?.data?.success) setPapers(papersRes.data.papers || []);
      if (statusRes?.data?.success) setStats(statusRes.data.summary || {});
    } catch (err) {
      console.error('Failed to fetch panel data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  const handleSubmitToHOD = async (paperId) => {
    const comment = comments[paperId] || '';
    setSubmitting(paperId);
    try {
      const res = await api.post(`/hod/panel/papers/${paperId}/submit`, { comments: comment });
      if (res.data.success) {
        alert('Paper submitted to HOD successfully');
        fetchPapers();
      }
    } catch (err) {
      alert('Failed to submit: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-8 mb-8 border-b-4 border-blue-500">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">SSN College of Engineering</p>
          <h1 className="text-4xl font-bold">Panel Dashboard</h1>
          <p className="text-slate-300 mt-1">Review and forward question papers to HOD</p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-8 max-w-2xl">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="font-bold text-slate-900">{user?.username}</h3>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
            <span className="px-4 py-1.5 rounded-full bg-blue-100 text-blue-800 font-bold text-sm border border-blue-200">PANEL MEMBER</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center">
            <div className="text-3xl font-bold text-blue-700">{stats.withPanel ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Awaiting Review</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center">
            <div className="text-3xl font-bold text-indigo-600">{stats.submitted ?? 0}</div>
            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Submitted to HOD</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center">
            <div className="text-3xl font-bold text-slate-700">{papers.length}</div>
            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Total Papers</div>
          </div>
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto mb-10">
          <button onClick={() => navigate('/papers')}
            className="rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md p-6 text-left transition">
            <h3 className="text-lg font-bold text-slate-900 mb-1">View All Papers</h3>
            <p className="text-sm text-slate-500">Browse all question papers in the system</p>
          </button>
          <button onClick={() => navigate('/papers?status=with_panel')}
            className="rounded-xl border border-slate-200 bg-white hover:border-blue-300 hover:shadow-md p-6 text-left transition">
            <h3 className="text-lg font-bold text-slate-900 mb-1">Papers Awaiting Review</h3>
            <p className="text-sm text-slate-500">Open randomized final papers and forward to HOD</p>
          </button>
        </div>

        {/* Papers List */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-bold text-slate-800 mb-4">Papers Assigned to Panel</h2>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p>Loading papers...</p>
            </div>
          ) : papers.length === 0 ? (
            <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-10 text-center text-slate-400">
              <p className="text-lg font-semibold text-slate-600">No papers assigned yet</p>
              <p className="text-sm mt-1">Papers will appear here once Scrutinizer 2 sends them to the panel.</p>
            </div>
          ) : (
            <div className="grid gap-5">
              {papers.map(paper => (
                <div key={paper.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                  <div className="bg-slate-900 text-white px-5 py-4 border-b-2 border-blue-500">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-base">{paper.courseCode} — {paper.examType} {paper.catNumber}</h3>
                      {paper.isShuffled && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-400 text-green-900">Shuffled</span>
                      )}
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

                    <textarea
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                      rows={3}
                      placeholder="Add comments for HOD (optional)..."
                      value={comments[paper.id] || ''}
                      onChange={e => setComments(prev => ({ ...prev, [paper.id]: e.target.value }))}
                    />

                    <div className="flex gap-2">
                      <button onClick={() => navigate(`/papers/${paper.id}`)}
                        className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">
                        View Paper
                      </button>
                      <button onClick={() => handleSubmitToHOD(paper.id)} disabled={submitting === paper.id}
                        className="flex-1 py-2 rounded-lg bg-blue-700 hover:bg-blue-800 text-white font-semibold text-sm transition disabled:opacity-50">
                        {submitting === paper.id ? 'Submitting...' : 'Submit to HOD'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PanelDashboard;
