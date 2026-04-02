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
    <div className="min-h-screen bg-ssn-light">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Welcome */}
        <div className="text-center mb-12">
          <div className="inline-block bg-ssn-blue text-white rounded-2xl p-5 mb-6">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-ssn-dark mb-3">HOD Dashboard</h1>
          <p className="text-xl text-gray-600 font-normal">Final approval of question papers</p>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-ssn-dark">{user?.username}</h3>
              <p className="text-gray-600 font-normal text-sm">{user?.email}</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-ssn-light text-ssn-blue font-bold text-sm">HOD</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-ssn-blue">{stats.withHod ?? 0}</div>
            <div className="text-sm text-gray-600 mt-1 font-normal">Awaiting Approval</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.approved ?? 0}</div>
            <div className="text-sm text-gray-600 mt-1 font-normal">Approved</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-gray-600">{stats.total ?? 0}</div>
            <div className="text-sm text-gray-600 mt-1 font-normal">Total Papers</div>
          </div>
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          <button onClick={() => navigate('/papers?status=with_hod')} className="bg-white border-l-4 border-ssn-blue hover:shadow-lg rounded-xl p-8 shadow transition-all text-left">
            <div className="mb-4 inline-block bg-ssn-light p-3 rounded-lg">
              <svg className="w-8 h-8 text-ssn-blue" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-ssn-dark mb-2">Papers Awaiting Approval</h3>
            <p className="text-gray-600 font-normal">Review and give final approval to question papers</p>
          </button>
          <button onClick={() => navigate('/papers')} className="bg-white border-l-4 border-gray-400 hover:shadow-lg rounded-xl p-8 shadow transition-all text-left">
            <div className="mb-4 inline-block bg-gray-100 p-3 rounded-lg">
              <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-ssn-dark mb-2">View All Papers</h3>
            <p className="text-gray-600 font-normal">Browse all question papers in the system</p>
          </button>
        </div>

        {/* Pending Papers */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Papers Awaiting Your Approval</h2>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="inline-block w-10 h-10 border-4 border-ssn-blue border-t-transparent rounded-full animate-spin mb-3" />
              <p className="font-normal">Loading papers...</p>
            </div>
          ) : papers.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500 border-2 border-dashed border-gray-200">
              <p className="text-lg font-semibold">No papers pending approval</p>
              <p className="text-sm mt-1 font-normal">Papers will appear here once the Panel Member forwards them.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {papers.map(paper => (
                <div key={paper.id} className="bg-white rounded-xl shadow-lg overflow-hidden border-l-4 border-ssn-blue">
                  <div className="bg-ssn-dark text-white p-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-bold">{paper.courseCode} - {paper.examType} {paper.catNumber}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-ssn-light text-ssn-blue">Pending Review</span>
                    </div>
                    <p className="text-sm text-gray-300 mt-2 font-normal">{paper.courseName} · Created by {paper.createdBy}</p>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-3 gap-3 mb-4 text-center text-sm">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="font-bold text-ssn-blue text-lg">{paper.sections?.['2M']?.length || 0}</div>
                        <div className="text-gray-600 font-normal text-xs">2-Mark Questions</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="font-bold text-orange-700 text-lg">{paper.sections?.['6M']?.length || 0}</div>
                        <div className="text-gray-600 font-normal text-xs">6-Mark Questions</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="font-bold text-purple-700 text-lg">{paper.sections?.['12M']?.length || 0}</div>
                        <div className="text-gray-600 font-normal text-xs">12-Mark Questions</div>
                      </div>
                    </div>
                    {paper.panelMemberComments && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 text-sm">
                        <span className="font-semibold text-ssn-dark">Panel Member Notes:</span>
                        <p className="text-gray-700 font-normal mt-1">{paper.panelMemberComments}</p>
                      </div>
                    )}
                    <textarea
                      className="w-full border border-gray-300 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-ssn-blue focus:ring-2 focus:ring-ssn-light font-normal"
                      rows={3}
                      placeholder="Add your approval or rejection comments (required)..."
                      value={comments[paper.id] || ''}
                      onChange={e => setComments(prev => ({ ...prev, [paper.id]: e.target.value }))}
                    />
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => navigate(`/papers/${paper.id}`)} className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-ssn-dark rounded-lg font-semibold text-sm transition-all">
                        View Paper
                      </button>
                      <button onClick={() => handleReject(paper.id)} disabled={!!acting} className="flex-1 py-2 px-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50">
                        {acting === paper.id + '_reject' ? 'Rejecting...' : 'Reject'}
                      </button>
                      <button onClick={() => handleApprove(paper.id)} disabled={!!acting} className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50\">
                        {acting === paper.id + '_approve' ? 'Approving...' : 'Approve'}
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
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-ssn-dark">Approved Papers</h2>
              <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-sm font-bold">
                {approvedPapers.length} total
              </span>
            </div>
            <button
              onClick={() => { setShowApproved(v => !v); setExpandedId(null); }}
              className="flex items-center gap-2 px-5 py-2 bg-ssn-blue hover:bg-ssn-dark text-white rounded-lg font-semibold text-sm transition-all shadow\"
            >
              {showApproved ? 'Hide Papers' : 'View Approved Papers'}
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
                    <div key={paper.id} className="bg-white rounded-xl shadow overflow-hidden border-l-4 border-green-500">
                      <button
                        onClick={() => setExpandedId(isOpen ? null : paper.id)}
                        className="w-full text-left p-4 flex items-center justify-between gap-4 hover:bg-green-50 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 h-8 flex-shrink-0 rounded-full bg-green-100 text-green-700 flex items-center justify-center font-bold text-sm">✓</span>
                          <div className="min-w-0">
                            <p className="font-bold text-ssn-dark truncate">{paper.courseCode} — {paper.examType} {paper.catNumber}</p>
                            <p className="text-xs text-gray-600 truncate font-normal">{paper.courseName} · by {paper.createdBy} · Approved {new Date(paper.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="hidden sm:inline px-3 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">Approved</span>
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
