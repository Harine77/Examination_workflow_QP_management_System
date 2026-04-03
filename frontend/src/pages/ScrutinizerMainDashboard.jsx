import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { toast } from 'react-toastify';

const ScrutinizerMainDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pending: 0, approved: 0, flagged: 0 });
  const [allCourses, setAllCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [showEnrollment, setShowEnrollment] = useState(false);
  const [savingEnrollment, setSavingEnrollment] = useState(false);

  const isS1 = user?.role === 'scrutinizer_1';
  const isS2 = user?.role === 'scrutinizer_2';

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/scrutinizer/papers');
      const papers = res.data.papers || res.data || [];
      const allPapers = Array.isArray(papers) ? papers : [];
      setStats({
        pending: allPapers.filter(p => !p.review_status).length,
        approved: allPapers.filter(p => p.review_status === 'APPROVED').length,
        flagged: allPapers.filter(p => p.review_status === 'SUGGESTED').length,
      });
    } catch (_) {}
  }, []);

  const fetchCourses = useCallback(async () => {
    if (!isS1) return;
    try {
      const res = await api.get('/courses');
      setAllCourses(res.data.data || []);
      // Load current enrolled courses from user profile
      const meRes = await api.get('/auth/me');
      setEnrolledCourses(meRes.data.data?.enrolledCourses || user?.enrolledCourses || []);
    } catch (_) {}
  }, [isS1, user]);

  useEffect(() => { fetchStats(); fetchCourses(); }, [fetchStats, fetchCourses]);

  const toggleCourse = (courseId) => {
    setEnrolledCourses(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const saveEnrollment = async () => {
    setSavingEnrollment(true);
    try {
      await api.post('/auth/request-courses', { courseIds: enrolledCourses });
      toast.success('Request sent to HOD for approval!');
      setShowEnrollment(false);
    } catch (err) {
      toast.error('Failed: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingEnrollment(false);
    }
  };

  const accent = 'border-emerald-500';

  const actions = [
    {
      title: 'Papers for Review',
      description: isS2 ? 'Review papers passed by Scrutinizer 1.' : 'Open papers pending first scrutiny.',
      path: '/scrutinizer-review',
      color: 'bg-emerald-700 hover:bg-emerald-800',
      badge: stats.pending,
    },
    {
      title: 'All Papers',
      description: 'Browse all question papers in the system.',
      path: '/scrutinizer-all-papers',
      color: 'bg-slate-700 hover:bg-slate-800',
      badge: null,
    },
  ];

  // Add course enrollment option for Scrutinizer 1
  if (isS1) {
    actions.push({
      title: 'Request Courses',
      description: 'Request enrollment in courses to review question papers.',
      path: '/request-courses',
      color: 'bg-amber-600 hover:bg-amber-700',
      badge: null,
    });
  }

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className={`rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-10 mb-10 border-b-4 ${accent}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">SSN College of Engineering</p>
          <h1 className="text-4xl font-bold">
            {isS2 ? 'Scrutinizer 2' : 'Scrutinizer 1'} Dashboard
          </h1>
          <p className="text-slate-300 mt-2 text-sm">
            Logged in as <span className="font-semibold text-white">{user?.username}</span> · {user?.email}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-10">
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center">
            <div className="text-3xl font-bold text-amber-600">{stats.pending}</div>
            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Pending Review</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center">
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Approved</div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 text-center">
            <div className="text-3xl font-bold text-red-500">{stats.flagged}</div>
            <div className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Flagged</div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          {actions.map((action) => (
            <button key={action.path} onClick={() => navigate(action.path)}
              className={`${action.color} text-white rounded-xl p-7 text-left shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 relative`}>
              {action.badge > 0 && (
                <span className="absolute top-4 right-4 bg-white text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {action.badge}
                </span>
              )}
              <h3 className="text-xl font-bold mb-2">{action.title}</h3>
              <p className="text-sm opacity-80 leading-6">{action.description}</p>
            </button>
          ))}
        </div>

        {/* Course Enrollment — Scrutinizer 1 only */}
        {isS1 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900">My Enrolled Courses</h3>
                <p className="text-sm text-slate-500 mt-0.5">Only papers from these courses will be assigned to you.</p>
              </div>
              <button onClick={() => setShowEnrollment(!showEnrollment)}
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition">
                {showEnrollment ? 'Cancel' : 'Manage Courses'}
              </button>
            </div>

            {/* Current enrolled courses */}
            {!showEnrollment && (
              <div className="flex flex-wrap gap-2">
                {enrolledCourses.length === 0 ? (
                  <p className="text-sm text-slate-400">No courses enrolled yet. Click "Manage Courses" to enroll.</p>
                ) : (
                  allCourses.filter(c => enrolledCourses.includes(c.id)).map(c => (
                    <span key={c.id} className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold border border-emerald-200">
                      {c.courseCode} — {c.courseName}
                    </span>
                  ))
                )}
              </div>
            )}

            {/* Enrollment editor */}
            {showEnrollment && (
              <div className="space-y-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 max-h-64 overflow-y-auto space-y-2">
                  {allCourses.map(course => (
                    <label key={course.id} className="flex items-center gap-3 cursor-pointer hover:bg-white rounded-lg px-2 py-2 transition">
                      <input
                        type="checkbox"
                        checked={enrolledCourses.includes(course.id)}
                        onChange={() => toggleCourse(course.id)}
                        className="w-4 h-4 rounded border-slate-300 text-emerald-600"
                      />
                      <span className="text-sm text-slate-700">
                        <span className="font-semibold text-emerald-700">{course.courseCode}</span> — {course.courseName}
                        <span className="ml-2 text-xs text-slate-400">Sem {course.semester}</span>
                      </span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowEnrollment(false)}
                    className="px-5 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm transition">
                    Cancel
                  </button>
                  <button onClick={saveEnrollment} disabled={savingEnrollment}
                    className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition disabled:opacity-50">
                    {savingEnrollment ? 'Sending...' : `Send Request to HOD (${enrolledCourses.length} courses)`}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ScrutinizerMainDashboard;
