import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const HODDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [approvedPapers, setApprovedPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ withHod: 0, approved: 0, total: 0 });
  const [comments, setComments] = useState({});
  const [acting, setActing] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showApproved, setShowApproved] = useState(false);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const [papersRes, statusRes, approvedRes] = await Promise.all([
        api.get('/hod/papers').catch(() => null),
        api.get('/hod/status').catch(() => null),
        api.get('/hod/approved-papers').catch(() => null),
      ]);
      if (papersRes?.data?.success) setPapers(papersRes.data.papers || []);
      if (statusRes?.data?.success) setStats(statusRes.data.summary || {});
      if (approvedRes?.data?.success) setApprovedPapers(approvedRes.data.papers || []);
    } catch (err) {
      console.error('Failed to fetch HOD data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  const handleApprove = async (paperId) => {
    const comment = comments[paperId] || '';
    if (!comment.trim()) { alert('Please add approval comments before approving.'); return; }
    setActing(paperId + '_approve');
    try {
      const res = await api.post(`/hod/papers/${paperId}/approve`, { comments: comment });
      if (res.data.success) {
        alert('Paper approved successfully! Workflow complete.');
        setComments(prev => ({ ...prev, [paperId]: '' }));
        fetchPapers();
      }
    } catch (err) {
      alert('Failed to approve: ' + (err.response?.data?.error || err.message));
    } finally {
      setActing(null);
    }
  };

  const handleReject = async (paperId) => {
    const comment = comments[paperId] || '';
    if (!comment.trim()) { alert('Please add rejection comments before rejecting.'); return; }
    setActing(paperId + '_reject');
    try {
      const res = await api.post(`/hod/papers/${paperId}/reject`, { comments: comment });
      if (res.data.success) {
        alert('Paper sent back to Panel Member for revision.');
        setComments(prev => ({ ...prev, [paperId]: '' }));
        fetchPapers();
      }
    } catch (err) {
      alert('Failed to reject: ' + (err.response?.data?.error || err.message));
    } finally {
      setActing(null);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Welcome */}
        <div className="text-center mb-12">
          <div className="text-7xl mb-4">🏛️</div>
          <h1 className="text-5xl font-bold text-gray-800 mb-3">HOD Dashboard</h1>
          <p className="text-xl text-gray-600">Final approval of question papers</p>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{user?.username}</h3>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 font-bold">HOD</div>
              <button onClick={handleLogout} className="px-4 py-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm transition-all">
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-indigo-600">{stats.withHod ?? 0}</div>
            <div className="text-sm text-gray-600 mt-1">Awaiting Approval</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.approved ?? 0}</div>
            <div className="text-sm text-gray-600 mt-1">Approved</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-gray-600">{stats.total ?? 0}</div>
            <div className="text-sm text-gray-600 mt-1">Total Papers</div>
          </div>
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          <button onClick={() => navigate('/papers')} className="bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl p-8 shadow-lg transform hover:scale-105 transition-all text-left">
            <div className="text-5xl mb-4">👁️</div>
            <h3 className="text-2xl font-bold mb-2">View All Papers</h3>
            <p className="text-sm opacity-90">Browse all question papers in the system</p>
          </button>
          <button onClick={() => navigate('/papers?status=with_hod')} className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl p-8 shadow-lg transform hover:scale-105 transition-all text-left">
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-2xl font-bold mb-2">Papers Awaiting Approval</h3>
            <p className="text-sm opacity-90">Review and give final approval to question papers</p>
          </button>
        </div>

        {/* Pending Papers */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Papers Awaiting Your Approval</h2>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="inline-block w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-3" />
              <p>Loading papers...</p>
            </div>
          ) : papers.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500 border-2 border-dashed border-gray-200">
              <p className="text-lg font-semibold">No papers pending approval</p>
              <p className="text-sm mt-1">Papers will appear here once the Panel Member forwards them.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {papers.map(paper => (
                <div key={paper.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gray-900 text-white p-4 border-b-2 border-indigo-400">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{paper.courseCode} - {paper.examType} {paper.catNumber}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-400 text-indigo-900">Pending HOD</span>
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
                    {paper.panelMemberComments && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-sm text-gray-700">
                        <span className="font-semibold">Panel Member Notes:</span> {paper.panelMemberComments}
                      </div>
                    )}
                    <textarea
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                      rows={3}
                      placeholder="Add your approval or rejection comments (required)..."
                      value={comments[paper.id] || ''}
                      onChange={e => setComments(prev => ({ ...prev, [paper.id]: e.target.value }))}
                    />
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => navigate(`/papers/${paper.id}`)} className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-all">
                        View Paper
                      </button>
                      <button onClick={() => handleReject(paper.id)} disabled={!!acting} className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50">
                        {acting === paper.id + '_reject' ? 'Rejecting...' : '↩ Reject'}
                      </button>
                      <button onClick={() => handleApprove(paper.id)} disabled={!!acting} className="flex-1 py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50">
                        {acting === paper.id + '_approve' ? 'Approving...' : '✓ Approve'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Approved Papers */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-800">Approved Papers</h2>
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold">
                {approvedPapers.length} total
              </span>
            </div>
            <button
              onClick={() => { setShowApproved(v => !v); setExpandedId(null); }}
              className="flex items-center gap-2 px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-all shadow"
            >
              {showApproved ? '▲ Hide Papers' : '▼ View Approved Papers'}
            </button>
          </div>

          {showApproved && (
            !loading && approvedPapers.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 border-2 border-dashed border-gray-200">
                <p className="text-base font-semibold">No approved papers yet</p>
              </div>
            ) : showApproved && (
              <div className="grid gap-3">
                {approvedPapers.map(paper => {
                  const isOpen = expandedId === paper.id;
                  return (
                    <div key={paper.id} className="bg-white rounded-xl shadow overflow-hidden">
                      <button
                        onClick={() => setExpandedId(isOpen ? null : paper.id)}
                        className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-green-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 h-8 flex-shrink-0 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">✓</span>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 truncate">{paper.courseCode} — {paper.examType} {paper.catNumber}</p>
                            <p className="text-xs text-gray-500 truncate">{paper.courseName} · by {paper.createdBy} · Approved {new Date(paper.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="hidden sm:inline px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">HOD Approved</span>
                          <span className="text-gray-400 text-lg">{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-gray-100 p-5">
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
                          {paper.examDate && (
                            <p className="text-sm text-gray-500 mb-3">
                              Exam date: {new Date(paper.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                          {paper.hodComments && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-3 text-sm text-green-800">
                              <span className="font-semibold">Your Comments:</span> {paper.hodComments}
                            </div>
                          )}
                          {paper.panelMemberComments && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 text-sm text-gray-700">
                              <span className="font-semibold">Panel Notes:</span> {paper.panelMemberComments}
                            </div>
                          )}
                          <button
                            onClick={() => navigate(`/papers/${paper.id}`)}
                            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-all"
                          >
                            View Full Paper
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
};

export default HODDashboard;
