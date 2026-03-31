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
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="text-7xl mb-4">👥</div>
          <h1 className="text-5xl font-bold text-gray-800 mb-3">Panel Dashboard</h1>
          <p className="text-xl text-gray-600">Review and forward question papers to HOD</p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{user?.username}</h3>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-yellow-100 text-yellow-700 font-bold">PANEL</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-yellow-600">{stats.withPanel ?? 0}</div>
            <div className="text-sm text-gray-600 mt-1">Awaiting Review</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.submitted ?? 0}</div>
            <div className="text-sm text-gray-600 mt-1">Submitted to HOD</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-gray-600">{papers.length}</div>
            <div className="text-sm text-gray-600 mt-1">Total Papers</div>
          </div>
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          <button
            onClick={() => navigate('/papers')}
            className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl p-8 shadow-lg transform hover:scale-105 transition-all text-left"
          >
            <div className="text-5xl mb-4">👁️</div>
            <h3 className="text-2xl font-bold mb-2">View All Papers</h3>
            <p className="text-sm opacity-90">Browse all question papers in the system</p>
          </button>
          <button
            onClick={() => navigate('/papers?status=with_panel')}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl p-8 shadow-lg transform hover:scale-105 transition-all text-left"
          >
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-2xl font-bold mb-2">Papers Awaiting Review</h3>
            <p className="text-sm opacity-90">Open randomized final papers and forward to HOD</p>
          </button>
        </div>

        {/* Papers List */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Papers Assigned to Panel</h2>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="inline-block w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p>Loading papers...</p>
            </div>
          ) : papers.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500 border-2 border-dashed border-gray-200">
              <p className="text-lg font-semibold">No papers assigned yet</p>
              <p className="text-sm mt-1">Papers will appear here once Scrutinizer 2 sends them to the panel.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {papers.map(paper => (
                <div key={paper.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gray-900 text-white p-4 border-b-2 border-yellow-400">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{paper.courseCode} - {paper.examType} {paper.catNumber}</h3>
                      {paper.isShuffled && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-400 text-green-900">🎲 Shuffled</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{paper.courseName} · Created by {paper.createdBy}</p>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-3 gap-3 mb-4 text-center text-sm">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="font-bold text-blue-700">{paper.sections?.['2M']?.length || 0}</div>
                        <div className="text-gray-500">2-Mark Qs</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="font-bold text-orange-700">{paper.sections?.['6M']?.length || 0}</div>
                        <div className="text-gray-500">6-Mark Qs</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="font-bold text-purple-700">{paper.sections?.['12M']?.length || 0}</div>
                        <div className="text-gray-500">12-Mark Qs</div>
                      </div>
                    </div>

                    {paper.scrutinizer2Comments && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-sm text-gray-700">
                        <span className="font-semibold">Scrutinizer 2 Notes:</span> {paper.scrutinizer2Comments}
                      </div>
                    )}

                    <textarea
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                      rows={3}
                      placeholder="Add comments for HOD (optional)..."
                      value={comments[paper.id] || ''}
                      onChange={e => setComments(prev => ({ ...prev, [paper.id]: e.target.value }))}
                    />

                    <div className="flex gap-3 mt-3">
                      <button
                        onClick={() => navigate(`/papers/${paper.id}`)}
                        className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-all"
                      >
                        View Paper
                      </button>
                      <button
                        onClick={() => handleSubmitToHOD(paper.id)}
                        disabled={submitting === paper.id}
                        className="flex-1 py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                      >
                        {submitting === paper.id ? 'Submitting...' : '→ Submit to HOD'}
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
