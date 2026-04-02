import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { toast } from 'react-toastify';

const Signup = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'faculty'
  });
  const [loading, setLoading] = useState(false);
  
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
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

    setLoading(true);
    try {
      const response = await signup(formData.username, formData.email, formData.password, formData.role);
      toast.success('Account created successfully!');
      
      // Navigate based on role
      const userRole = response.data.data?.role;
      switch(userRole) {
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
    <div className="min-h-screen bg-ssn-light flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-block bg-ssn-blue text-white rounded-xl p-5 mb-8">
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
            </svg>
          </div>
          <h1 className="text-4xl font-bold text-ssn-dark mb-2">Create Account</h1>
          <p className="text-lg text-gray-600 font-normal">Join SSN Engineering College Portal</p>
        </div>

        {/* Signup Card */}
        <div className="card p-10 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="form-label">Username</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="form-input"
                placeholder="john_doe"
                required
              />
            </div>

            {/* Email */}
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="faculty@example.com"
                required
              />
            </div>

            {/* Role */}
            <div>
              <label className="form-label">Select Role</label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="form-input"
              >
                <option value="faculty">Faculty (Create Question Papers)</option>
                <option value="scrutinizer_1">Scrutinizer 1 (First Review & Evaluation)</option>
                <option value="scrutinizer_2">Scrutinizer 2 (Secondary Review)</option>
                <option value="panel_member">Panel Member (Review & Approval)</option>
                <option value="hod">HOD (Final Approval)</option>
              </select>
            </div>

            {/* Password */}
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="••••••••"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="form-label">Confirm Password</label>
              <input
                type="password"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-semibold text-white transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {loading ? 'Creating Account...' : 'Sign Up'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="px-3 text-sm text-gray-500 font-normal">or</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Login Link */}
          <p className="text-center text-gray-700 font-normal">
            Already have an account?{' '}
            <Link to="/login" className="text-ssn-blue font-semibold hover:underline">
              Login here
            </Link>
          </p>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm font-normal">
          <p>© 2026 SSN Engineering College. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Signup;