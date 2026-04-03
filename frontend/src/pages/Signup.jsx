import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { toast } from 'react-toastify';
import SSNBrand from '../components/SSNBrand';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'faculty',
  });
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [availableCourses, setAvailableCourses] = useState([]);
  const [loading, setLoading] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch courses for enrollment dropdown
    const fetchCourses = async () => {
      try {
        const res = await axios.get(`${API_URL}/courses/public`);
        setAvailableCourses(res.data.data || []);
      } catch { /* ignore */ }
    };
    fetchCourses();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const toggleCourse = (courseId) => {
    setEnrolledCourses(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.username || !formData.email || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (formData.role === 'scrutinizer_1' && enrolledCourses.length === 0) {
      toast.error('Scrutinizer 1 must enroll in at least one course');
      return;
    }

    setLoading(true);
    try {
      const response = await signup(formData.username, formData.email, formData.password, formData.role, enrolledCourses);
      toast.success('Account created successfully');

      const userRole = response.data.data?.role;
      switch (userRole) {
        case 'scrutinizer':
        case 'scrutinizer_1':
        case 'scrutinizer_2':
          navigate('/scrutinizer');
          break;
        case 'hod':
          navigate('/hod-dashboard');
          break;
        case 'panel':
        case 'panel_member':
          navigate('/panel-dashboard');
          break;
        case 'faculty':
        default:
          navigate('/dashboard');
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(135deg,#f8fbff_0%,#eef4fc_55%,#e6eefb_100%)] px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl grid gap-8 lg:grid-cols-[1.05fr_0.95fr] items-center min-h-[calc(100vh-6rem)]">
        <section className="rounded-[32px] border border-blue-200 bg-[linear-gradient(135deg,#123c8c_0%,#0a2b69_100%)] px-8 py-10 text-white shadow-2xl lg:px-12 lg:py-14">
          <SSNBrand light />
          <div className="mt-10 max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">Institutional Access</div>
            <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Create a professional workflow account for SSN examination management.</h1>
            <p className="mt-5 text-base leading-7 text-blue-50/90 sm:text-lg">
              Assign the right review role, keep approvals traceable, and work with a consistent academic process across faculty, scrutiny, panel, and HOD levels.
            </p>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Register</div>
            <h2 className="mt-3 font-serif text-3xl text-slate-900">Create your account</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Use a clear role assignment to keep the workflow organized from the beginning.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
              <input type="text" name="username" value={formData.username} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white" placeholder="username" required />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white" placeholder="name@ssn.edu.in" required />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
              <select name="role" value={formData.role} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white">
                <option value="faculty">Faculty</option>
                <option value="scrutinizer_1">Scrutinizer 1</option>
                <option value="scrutinizer_2">Scrutinizer 2</option>
                <option value="panel_member">Panel Member</option>
                <option value="hod">HOD</option>
              </select>
            </div>

            {/* Course enrollment — only for Scrutinizer 1 */}
            {formData.role === 'scrutinizer_1' && (
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Enroll in Courses <span className="text-red-500">*</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">Select the courses you are responsible for reviewing. Only papers from these courses will be assigned to you.</p>
                {availableCourses.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                    No courses available yet. Ask admin to add courses first.
                  </div>
                ) : (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 max-h-48 overflow-y-auto space-y-2">
                    {availableCourses.map(course => (
                      <label key={course.id} className="flex items-center gap-3 cursor-pointer hover:bg-white rounded-lg px-2 py-1.5 transition">
                        <input
                          type="checkbox"
                          checked={enrolledCourses.includes(course.id)}
                          onChange={() => toggleCourse(course.id)}
                          className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-500"
                        />
                        <span className="text-sm text-slate-700">
                          <span className="font-semibold text-blue-700">{course.courseCode}</span> — {course.courseName}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {enrolledCourses.length > 0 && (
                  <p className="text-xs text-green-600 mt-1">{enrolledCourses.length} course{enrolledCourses.length !== 1 ? 's' : ''} selected</p>
                )}
              </div>
            )}

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white" placeholder="Minimum 6 characters" required />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Confirm Password</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white" placeholder="Re-enter password" required />
            </div>

            <button type="submit" disabled={loading} className={`w-full rounded-2xl py-3 font-semibold text-white transition-all ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#0a2b69] hover:bg-[#123c8c] shadow-lg'}`}>
              {loading ? 'Creating account...' : 'Sign Up'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-blue-700 hover:text-blue-800">
              Login here
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Signup;
