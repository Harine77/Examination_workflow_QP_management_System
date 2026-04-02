import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { toast } from 'react-toastify';
import SSNBrand from '../components/SSNBrand';

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

      toast.success('Login successful');

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
      toast.error(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-4 py-12 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl grid gap-8 lg:grid-cols-[1.15fr_0.85fr] items-center min-h-[calc(100vh-6rem)]">
        <section className="rounded-[32px] border border-blue-200 bg-[linear-gradient(135deg,#123c8c_0%,#0a2b69_100%)] px-8 py-10 text-white shadow-2xl lg:px-12 lg:py-14">
          <SSNBrand light />
          <div className="mt-10 max-w-2xl">
            <div className="text-xs font-semibold uppercase tracking-[0.28em] text-blue-100">Academic Workflow Portal</div>
            <h1 className="mt-4 font-serif text-4xl leading-tight sm:text-5xl">Structured question paper governance for SSN College of Engineering.</h1>
            <p className="mt-5 text-base leading-7 text-blue-50/90 sm:text-lg">
              Manage faculty submissions, scrutiny, panel review, HOD approval, and answer-key generation in one professional workflow.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-2xl font-semibold">Faculty</div>
              <div className="mt-1 text-sm text-blue-100/80">Create and track papers</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-2xl font-semibold">Scrutiny</div>
              <div className="mt-1 text-sm text-blue-100/80">Review with workflow control</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="text-2xl font-semibold">Approval</div>
              <div className="mt-1 text-sm text-blue-100/80">Panel and HOD decisions</div>
            </div>
          </div>
        </section>

        <section className="rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl sm:p-10">
          <div className="mb-8">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-700">Sign In</div>
            <h2 className="mt-3 font-serif text-3xl text-slate-900">Access your workspace</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">Use your institutional account to continue to the SSN question paper portal.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white"
                placeholder="name@ssn.edu.in"
                required
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 py-3 text-slate-800 outline-none transition focus:border-blue-700 focus:bg-white"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full rounded-2xl py-3 font-semibold text-white transition-all ${loading ? 'bg-slate-400 cursor-not-allowed' : 'bg-[#0a2b69] hover:bg-[#123c8c] shadow-lg'}`}
            >
              {loading ? 'Signing in...' : 'Login'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Don&apos;t have an account?{' '}
            <Link to="/signup" className="font-semibold text-blue-700 hover:text-blue-800">
              Create an account
            </Link>
          </div>

          <div className="mt-8 rounded-2xl border border-blue-100 bg-blue-50 p-5">
            <div className="text-sm font-semibold text-slate-800">Demo Accounts</div>
            <div className="mt-3 space-y-2 text-xs leading-5 text-slate-600">
              <p><strong>Faculty:</strong> faculty@example.com / faculty123</p>
              <p><strong>Scrutinizer 1:</strong> scrutinizer1@example.com / scrutinizer123</p>
              <p><strong>Scrutinizer 2:</strong> scrutinizer2@example.com / scrutinizer123</p>
              <p><strong>Panel:</strong> panel@example.com / panel123</p>
              <p><strong>HOD:</strong> hod@example.com / hod123</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Login;
