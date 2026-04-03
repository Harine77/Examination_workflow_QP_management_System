import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

const HODPapers = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [acting, setActing] = useState({});
  const [activityLog, setActivityLog] = useState(null);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/hod/papers');
      if (res.data.success) setPapers(res.data.papers || []);
    } catch (err) {
      console.error('Failed to fetch papers:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  const fetchActivityLog = async (paperId) => {
    try {
      const res = await api.get(`/hod/papers/${paperId}/activity-log`);
      if (res.data.success) setActivityLog(res.data);
    } catch (err) {
      console.error('Failed to fetch activity log:', err);
    }
  };

  const handleApprove = async (paperId) => {
    if (!comments[paperId]?.trim()) return alert('Please add approval comments');
    setActing((p) => ({ ...p, [paperId]: 'approve' }));
    try {
      const res = await api.post(`/hod/papers/${paperId}/approve`, { comments: comments[paperId] });
      if (res.data.success) {
        alert('Paper approved successfully');
        setComments((p) => ({ ...p, [paperId]: '' }));
        fetchPapers();
      }
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setActing((p) => ({ ...p, [paperId]: null }));
    }
  };

  const handleReject = async (paperId) => {
    if (!comments[paperId]?.trim()) return alert('Please add rejection comments');
    setActing((p) => ({ ...p, [paperId]: 'reject' }));
    try {
      const res = await api.post(`/hod/papers/${paperId}/reject`, { comments: comments[paperId] });
      if (res.data.success) {
        alert('Paper rejected back to Panel Member');
        setComments((p) => ({ ...p, [paperId]: '' }));
        fetchPapers();
      }
    } catch (err) {
      alert('Failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setActing((p) => ({ ...p, [paperId]: null }));
    }
  };

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button onClick={() => navigate('/hod-dashboard')}
            className="text-slate-500 hover:text-slate-800 text-sm font-medium transition">
            ← Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Pending Approvals</h1>
            <p className="text-sm text-slate-500 mt-0.5">Papers waiting for your decision</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <div className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p>Loading papers...</p>
          </div>
        ) : papers.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-16 text-center">
            <p className="text-lg font-semibold text-slate-700">No pending papers</p>
            <p className="text-sm text-slate-400 mt-1">All papers have been processed.</p>
          </div>
        ) : (
          <div className="grid gap-5">
            {papers.map((paper) => (
              <div key={paper.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Card Header */}
                <div className="bg-slate-900 text-white px-5 py-4 border-b-2 border-purple-400">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div>
                      <h3 className="font-bold text-base">{paper.courseCode} — {paper.examType} {paper.catNumber || ''}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{paper.courseName} · Created by {paper.createdBy}</p>
                    </div>
                    <span className="text-xs text-slate-400">{new Date(paper.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  {/* Question counts */}
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

                  {/* Panel comments */}
                  {paper.panelMemberComments && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                      <span className="font-semibold">Panel Comments:</span> {paper.panelMemberComments}
                    </div>
                  )}

                  {/* HOD comment input */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1.5 uppercase tracking-wide">Your Comments (required)</label>
                    <textarea
                      rows={3}
                      className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
                      placeholder="Enter approval or rejection comments..."
                      value={comments[paper.id] || ''}
                      onChange={(e) => setComments((p) => ({ ...p, [paper.id]: e.target.value }))}
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button onClick={() => navigate(`/papers/${paper.id}`)}
                      className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">
                      View Paper
                    </button>
                    <button onClick={() => fetchActivityLog(paper.id)}
                      className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">
                      History
                    </button>
                    <button onClick={() => handleApprove(paper.id)} disabled={acting[paper.id] === 'approve'}
                      className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition disabled:opacity-50">
                      {acting[paper.id] === 'approve' ? 'Approving...' : 'Approve'}
                    </button>
                    <button onClick={() => handleReject(paper.id)} disabled={acting[paper.id] === 'reject'}
                      className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition disabled:opacity-50">
                      {acting[paper.id] === 'reject' ? 'Rejecting...' : 'Reject'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Log Modal */}
      {activityLog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setActivityLog(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="bg-slate-900 text-white px-6 py-4 border-b-2 border-purple-400 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">Review History</h2>
                <p className="text-xs text-slate-400 mt-0.5">{activityLog.paper?.courseCode} · {activityLog.paper?.currentStage}</p>
              </div>
              <button onClick={() => setActivityLog(null)} className="text-slate-400 hover:text-white text-xl">✕</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-3">
              {activityLog.activity?.map((item, idx) => (
                <div key={idx} className="flex gap-4 bg-slate-50 border-l-4 border-purple-400 rounded-r-lg px-4 py-3">
                  <div className="font-semibold text-slate-800 min-w-[90px] text-sm">{item.stage}</div>
                  <div className="flex-1 text-sm">
                    <div className="font-semibold text-green-700">{item.action}</div>
                    <div className="text-slate-500 text-xs mt-0.5">by {item.actor} · {new Date(item.timestamp).toLocaleString()}</div>
                    {item.comments && <div className="mt-1 bg-white border border-slate-200 rounded p-2 text-slate-700">{item.comments}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HODPapers;
