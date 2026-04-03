import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/authContext';
import api from '../services/api';

export default function PanelDashboardV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ pending: 0, submitted: 0, returned: 0, approved: 0 });

  const fetchStats = useCallback(async () => {
    try {
      const res = await api.get('/hod/panel/overview');
      if (res.data.success) {
        setStats({
          pending:   res.data.pendingReview?.length        || 0,
          submitted: res.data.submittedToHod?.length       || 0,
          approved:  res.data.hodApproved?.length          || 0,
          returned:  res.data.returnedToFaculties?.length  || 0,
        });
      }
    } catch (err) {
      console.error('Failed to fetch panel stats:', err);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  const sections = [
    {
      title: 'Awaiting Review',
      description: 'Papers assigned to panel — submit to HOD or return to faculties.',
      path: '/panel/awaiting-review',
      color: 'bg-blue-700 hover:bg-blue-800',
      badge: stats.pending,
    },
    {
      title: 'Submitted to HOD',
      description: 'Papers already forwarded to HOD for approval.',
      path: '/panel/submitted-to-hod',
      color: 'bg-indigo-700 hover:bg-indigo-800',
      badge: stats.submitted,
    },
    {
      title: 'HOD Approved',
      description: 'Approved papers — can still be returned to faculties with answer key.',
      path: '/panel/hod-approved',
      color: 'bg-green-700 hover:bg-green-800',
      badge: stats.approved,
    },
    {
      title: 'Returned to Faculties',
      description: 'Finalized papers returned with AI-generated answer keys.',
      path: '/panel/returned',
      color: 'bg-teal-700 hover:bg-teal-800',
      badge: stats.returned,
    },
  ];

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className="rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-10 mb-10 border-b-4 border-blue-500">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">SSN College of Engineering</p>
          <h1 className="text-4xl font-bold">Panel Dashboard</h1>
          <p className="text-slate-300 mt-2 text-sm">
            Logged in as <span className="font-semibold text-white">{user?.username}</span> · {user?.email}
          </p>
        </div>

        {/* 4 Section Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {sections.map((s) => (
            <button key={s.path} onClick={() => navigate(s.path)}
              className={`${s.color} text-white rounded-xl p-7 text-left shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5 relative`}>
              {s.badge > 0 && (
                <span className="absolute top-4 right-4 bg-white/20 text-white text-xs font-bold px-2.5 py-0.5 rounded-full border border-white/30">
                  {s.badge}
                </span>
              )}
              <h3 className="text-xl font-bold mb-2">{s.title}</h3>
              <p className="text-sm opacity-80 leading-6">{s.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
