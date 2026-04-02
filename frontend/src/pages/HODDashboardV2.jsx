import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/authContext';
import api from '../services/api';
import { toast } from 'react-toastify';

export default function HODDashboardV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pending: 0, approved: 0 });
  const [enrollmentRequests, setEnrollmentRequests] = useState([]);
  const [actingOn, setActingOn] = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/hod/overview');
      if (res.data.success) {
        setStats({
          pending: res.data.pendingApproval?.length || 0,
          approved: res.data.approvedPapers?.length || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch HOD stats:', err);
    }
  }, []);

  const fetchEnrollmentRequests = useCallback(async () => {
    try {
      const res = await api.get('/auth/enrollment-requests');
      if (res.data.success) setEnrollmentRequests(res.data.requests || []);
    } catch (_) {}
  }, []);

  useEffect(() => { fetchStats(); fetchEnrollmentRequests(); }, [fetchStats, fetchEnrollmentRequests]);

  const handleDecide = async (scrutinizerId, action, courseIds) => {
    setActingOn(scrutinizerId);
    try {
      await api.post(`/auth/enrollment-requests/${scrutinizerId}/decide`, { action, courseIds });
      toast.success(action === 'approve' ? 'Enrollment approved!' : 'Request rejected');
      fetchEnrollmentRequests();
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setActingOn(null);
    }
  };

  const actions = [
    { title: 'Pending Approvals', description: 'Review and approve papers waiting for your decision.', path: '/hod-papers', color: 'bg-purple-700 hover:bg-purple-800', badge: stats.pending },
    { title: 'All Papers', description: 'Browse the full paper repository by status.', path: '/papers', color: 'bg-slate-700 hover:bg-slate-800', badge: null },
  ];

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-10 mb-10 border-b-4 border-purple-500">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">SSN College of Engineering</p>
          <h1 className="text-4xl font-bold">HOD Dashboard</h1>
          <p className="text-slate-300 mt-2 text-sm">
            Logged in as <span className="font-semibold text-white">{user?.username}</span> · {user?.email}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 mb-10">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="text-4xl font-bold text-purple-700">{stats.pending}</div>
            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Pending Approval</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 text-center">
            <div className="text-4xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Approved Papers</div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {actions.map((action) => (
            <button key={action.path} onClick={() => navigate(action.path)}
              className={`${action.color} text-white rounded-xl p-7 text-left shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 relative`}>
              {action.badge > 0 && (
                <span className="absolute top-4 right-4 bg-white text-purple-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {action.badge}
                </span>
              )}
              <h3 className="text-xl font-bold mb-2">{action.title}</h3>
              <p className="text-sm opacity-80 leading-6">{action.description}</p>
            </button>
          ))}
        </div>

        {/* Course Enrollment Requests */}
        {enrollmentRequests.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-amber-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2.5 h-2.5 bg-amber-500 rounded-full" />
              <h3 className="font-bold text-slate-900">Course Enrollment Requests</h3>
              <span className="ml-auto px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-bold">{enrollmentRequests.length} pending</span>
            </div>
            <div className="space-y-4">
              {enrollmentRequests.map(req => (
                <div key={req.scrutinizerId} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-slate-900">{req.username}</p>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold uppercase">
                          {req.role === 'scrutinizer_1' ? 'Scrutinizer' : req.role}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">{req.email}</p>
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {req.requestedCourses.map(c => (
                          <span key={c.id} className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
                            {c.courseCode} — {c.courseName}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDecide(req.scrutinizerId, 'reject', req.requestedCourses.map(c => c.id))}
                        disabled={actingOn === req.scrutinizerId}
                        className="px-4 py-2 rounded-lg bg-red-100 hover:bg-red-200 text-red-700 font-semibold text-sm transition disabled:opacity-50">
                        Reject
                      </button>
                      <button
                        onClick={() => handleDecide(req.scrutinizerId, 'approve', req.requestedCourses.map(c => c.id))}
                        disabled={actingOn === req.scrutinizerId}
                        className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold text-sm transition disabled:opacity-50">
                        {actingOn === req.scrutinizerId ? 'Processing...' : 'Approve'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
