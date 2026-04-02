import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { toast } from 'react-toastify';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await login(email, password);
      const userRole = response.data.data?.role;
      
      toast.success('Login successful!');
      
      // Navigate based on role
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
      toast.error(error.response?.data?.message || 'Login failed');
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
          <h1 className="text-4xl font-bold text-ssn-dark mb-2">SSN Engineering College</h1>
          <p className="text-lg text-gray-600 font-normal">Exam Management System</p>
        </div>

        {/* Login Card */}
        <div className="card p-10 shadow-lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div>
              <label className="form-label">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="form-input"
                placeholder="faculty@example.com"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="form-label">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                placeholder="••••••••"
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-lg font-bold text-white transition-all ${
                loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'btn-primary'
              }`}
            >
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="px-3 text-sm text-gray-500 font-normal">or</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          {/* Signup Link */}
          <p className="text-center text-gray-700 font-normal">
            New user?{' '}
            <Link to="/signup" className="text-ssn-blue font-semibold hover:underline">
              Create account
            </Link>
          </p>
        </div>

        {/* Demo Credentials */}
        <div className="mt-8 card p-6">
          <h3 className="font-semibold text-ssn-dark mb-4 text-center">Demo Credentials</h3>
          <div className="space-y-3 text-sm">
            <div className="p-3 bg-ssn-light rounded">
              <p className="font-semibold text-gray-800">Faculty Account</p>
              <p className="text-gray-600 text-xs mt-1 font-normal">faculty@example.com / faculty123</p>
            </div>
            <div className="p-3 bg-ssn-light rounded">
              <p className="font-semibold text-gray-800">Scrutinizer 1 Account</p>
              <p className="text-gray-600 text-xs mt-1 font-normal">scrutinizer1@example.com / scrutinizer123</p>
            </div>
            <div className="p-3 bg-ssn-light rounded">
              <p className="font-semibold text-gray-800">HOD Account</p>
              <p className="text-gray-600 text-xs mt-1 font-normal">hod@example.com / hod123</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-8 text-center text-gray-500 text-sm font-normal">
          <p>© 2026 SSN Engineering College. All Rights Reserved.</p>
        </div>
      </div>
    </div>
  );
};

export default Login;