import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';
import api from '../services/api';
import { toast } from 'react-toastify';

export default function RequestCourseEnrollment() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [selectedCourses, setSelectedCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    fetchCourses();
    setEnrolledCourses(user?.enrolledCourses || []);
    setPendingRequests(user?.pendingCourseRequests || []);
  }, [user]);

  const fetchCourses = async () => {
    try {
      const res = await api.get('/courses/public');
      if (res.data.success) {
        setCourses(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load courses');
    } finally {
      setLoading(false);
    }
  };

  const toggleCourse = (courseId) => {
    setSelectedCourses(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    );
  };

  const handleSubmit = async () => {
    if (selectedCourses.length === 0) {
      toast.warning('Please select at least one course');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/auth/request-courses', { courseIds: selectedCourses });
      toast.success('Course enrollment request sent to HOD!');
      setSelectedCourses([]);
      // Refresh user data
      const userRes = await api.get('/auth/me');
      if (userRes.data.success) {
        setPendingRequests(userRes.data.data.pendingCourseRequests || []);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const isCourseEnrolled = (courseId) => enrolledCourses.includes(courseId);
  const isCoursePending = (courseId) => pendingRequests.includes(courseId);

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-8 mb-8 border-b-4 border-blue-400">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-1">SSN College of Engineering</p>
          <h1 className="text-4xl font-bold">Request Course Enrollment</h1>
          <p className="text-slate-300 mt-1">Select courses you want to create question papers for</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-6">
              <h2 className="text-xl font-bold text-slate-800 mb-4">Available Courses</h2>
              <div className="grid gap-3">
                {courses.map(course => {
                  const enrolled = isCourseEnrolled(course.id);
                  const pending = isCoursePending(course.id);
                  const selected = selectedCourses.includes(course.id);

                  return (
                    <div
                      key={course.id}
                      className={`p-4 rounded-lg border-2 transition ${
                        enrolled
                          ? 'bg-green-50 border-green-300'
                          : pending
                          ? 'bg-amber-50 border-amber-300'
                          : selected
                          ? 'bg-blue-50 border-blue-400'
                          : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-slate-900">
                              {course.courseCode} — {course.courseName}
                            </h3>
                            {enrolled && (
                              <span className="px-2 py-0.5 rounded-full bg-green-600 text-white text-xs font-semibold">
                                Enrolled
                              </span>
                            )}
                            {pending && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-600 text-white text-xs font-semibold">
                                Pending Approval
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-500 mt-1">Semester {course.semester}</p>
                        </div>
                        {!enrolled && !pending && (
                          <button
                            onClick={() => toggleCourse(course.id)}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                              selected
                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                            }`}
                          >
                            {selected ? 'Selected' : 'Select'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {selectedCourses.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-slate-900">
                      {selectedCourses.length} course{selectedCourses.length > 1 ? 's' : ''} selected
                    </h3>
                    <p className="text-sm text-slate-500 mt-1">
                      Your request will be sent to HOD for approval
                    </p>
                  </div>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50"
                  >
                    {submitting ? 'Submitting...' : 'Submit Request'}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-6 text-center">
              <button
                onClick={() => navigate('/dashboard')}
                className="text-slate-600 hover:text-slate-900 font-semibold"
              >
                ← Back to Dashboard
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
