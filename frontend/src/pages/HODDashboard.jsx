import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

const HODDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaperId, setSelectedPaperId] = useState(null);
  const [comments, setComments] = useState('');
  const [activityLog, setActivityLog] = useState(null);
  const [showActivityLog, setShowActivityLog] = useState(false);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/hod/papers');
      if (response.data.success) setPapers(response.data.papers || []);
    } catch (error) {
      console.error('Failed to fetch papers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  const fetchActivityLog = useCallback(async (paperId) => {
    try {
      const response = await api.get(`/hod/papers/${paperId}/activity-log`);
      if (response.data.success) {
        setActivityLog(response.data);
        setShowActivityLog(true);
      }
    } catch (error) {
      console.error('Failed to fetch activity log:', error);
    }
  }, []);

  const handleApprove = async (paperId) => {
    if (!comments.trim()) return alert('Please add approval comments');
    try {
      const response = await api.post(`/hod/papers/${paperId}/approve`, { comments });
      if (response.data.success) {
        alert('Paper approved successfully!');
        setSelectedPaperId(null);
        setComments('');
        fetchPapers();
      }
    } catch (error) {
      alert('Failed to approve: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleReject = async (paperId) => {
    if (!comments.trim()) return alert('Please add rejection comments');
    try {
      const response = await api.post(`/hod/papers/${paperId}/reject`, { comments });
      if (response.data.success) {
        alert('Paper rejected and sent back to Panel Member');
        setSelectedPaperId(null);
        setComments('');
        fetchPapers();
      }
    } catch (error) {
      alert('Failed to reject: ' + (error.response?.data?.error || error.message));
    }
  };

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Page Header */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-8 mb-8 border-b-4 border-yellow-400">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">SSN College of Engineering</p>
          <h1 className="text-4xl font-bold">HOD Dashboard</h1>
          <p className="text-slate-300 mt-1">Final approval of question papers</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Pending Approval', value: papers.length, color: 'text-yellow-600' },
            { label: 'Your Role', value: 'HOD', color: 'text-slate-800' },
            { label: 'Logged in as', value: user?.username, color: 'text-blue-700' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Papers */}
        <h2 className="text-xl font-bold text-slate-800 mb-4">Papers Awaiting Approval</h2>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <div className="w-10 h-10 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mb-3" />
            <p>Loading papers...</p>
          </div>
        ) : papers.length === 0 ? (
          <div className="bg-white rounded-xl border-2 border-dashed border-slate-200 p-12 text-center text-slate-500">
            <p className="text-lg font-semibold text-slate-700">No pending papers</p>
            <p className="text-sm mt-1">All papers have been processed.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2">
            {papers.map(paper => (
              <div key={paper.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Card Header */}
                <div className="bg-slate-900 text-white px-5 py-4 border-b-2 border-yellow-400">
                  <h3 className="font-bold text-base">{paper.courseCode} — {paper.examType}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{paper.catNumber} · Paper ID: {paper.id}</p>
                </div>

                <div className="p-5 space-y-4">
                  {/* Info */}
                  <div className="grid grid-cols-2 gap-2 text-sm text-slate-600">
                    <div><span className="font-semibold text-slate-800">Course:</span> {paper.courseName}</div>
                    <div><span className="font-semibold text-slate-800">Created by:</span> {paper.createdBy}</div>
                    <div><span className="font-semibold text-slate-800">Date:</span> {new Date(paper.createdAt).toLocaleDateString()}</div>
                    <div>
                      <span className="font-semibold text-slate-800">Questions:</span>{' '}
                      2M: {paper.sections?.['2M']?.length || 0} · 6M: {paper.sections?.['6M']?.length || 0} · 12M: {paper.sections?.['12M']?.length || 0}
                    </div>
                  </div>

                  {/* Panel Comments */}
                  {paper.panelMemberComments && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900">
                      <span className="font-semibold">Panel Comments:</span> {paper.panelMemberComments}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchActivityLog(paper.id)}
                      className="flex-1 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition"
                    >
                      View History
                    </button>
                    <button
                      onClick={() => {
                        setSelectedPaperId(selectedPaperId === paper.id ? null : paper.id);
                        setComments('');
                      }}
                      className="flex-1 py-2 rounded-lg bg-slate-900 hover:bg-slate-700 text-white font-semibold text-sm transition"
                    >
                      {selectedPaperId === paper.id ? 'Close' : 'Review'}
                    </button>
                  </div>

                  {/* Review Form */}
                  {selectedPaperId === paper.id && (
                    <div className="border-t border-slate-100 pt-4 space-y-3">
                      <label className="block text-sm font-semibold text-slate-700">Your Comments (required)</label>
                      <textarea
                        rows={3}
                        className="w-full border border-slate-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                        placeholder="Enter approval or rejection comments..."
                        value={comments}
                        onChange={e => setComments(e.target.value)}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(paper.id)}
                          className="flex-1 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(paper.id)}
                          className="flex-1 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-sm transition"
                        >
                          Reject
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Activity Log Modal */}
      {showActivityLog && activityLog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowActivityLog(false)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="bg-slate-900 text-white px-6 py-4 border-b-2 border-yellow-400 flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">Paper Review History</h2>
                <p className="text-xs text-slate-400 mt-0.5">{activityLog.paper?.courseCode} · {activityLog.paper?.currentStage}</p>
              </div>
              <button onClick={() => setShowActivityLog(false)} className="text-slate-400 hover:text-white text-xl leading-none">✕</button>
            </div>
            <div className="overflow-y-auto p-6 space-y-3">
              {activityLog.activity?.map((item, idx) => (
                <div key={idx} className="flex gap-4 bg-slate-50 border-l-4 border-yellow-400 rounded-r-lg px-4 py-3">
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

export default HODDashboard;
