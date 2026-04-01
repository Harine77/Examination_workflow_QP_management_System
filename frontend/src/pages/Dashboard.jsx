import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

const CATEGORY_STYLES = {
  received: 'bg-blue-100 text-blue-700',
  activity: 'bg-emerald-100 text-emerald-700',
  update: 'bg-indigo-100 text-indigo-700',
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const response = await api.get('/questions/notifications');
        if (response.data.success) {
          setNotifications(response.data.notifications || []);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotifications();
  }, []);

  const getRoleInfo = () => {
    switch (user.role) {
      case 'faculty':
        return {
          title: 'Faculty Dashboard',
          description: 'Create, review, and track your question papers across the approval workflow.',
          roleLabel: 'Faculty',
          actions: [
            {
              title: 'Create Question Paper',
              description: 'Prepare a new paper with CO and KL mapping.',
              action: () => navigate('/create-paper'),
            },
            {
              title: 'My Question Papers',
              description: 'Open the paper repository and track current statuses.',
              action: () => navigate('/papers'),
            },
          ],
        };
      case 'scrutinizer':
      case 'scrutinizer_1':
        return {
          title: 'Scrutinizer 1 Dashboard',
          description: 'Review faculty submissions and move valid papers to the next level.',
          roleLabel: 'Scrutinizer 1',
          actions: [
            {
              title: 'Papers to Review',
              description: 'View submissions currently waiting for first scrutiny.',
              action: () => navigate('/scrutinizer-review'),
            },
            {
              title: 'Scrutiny Workspace',
              description: 'Open the complete review dashboard.',
              action: () => navigate('/scrutinizer'),
            },
          ],
        };
      case 'scrutinizer_2':
        return {
          title: 'Scrutinizer 2 Dashboard',
          description: 'Approve reviewed papers or return them for revision where required.',
          roleLabel: 'Scrutinizer 2',
          actions: [
            {
              title: 'Awaiting Approval',
              description: 'Open papers passed by Scrutinizer 1.',
              action: () => navigate('/scrutinizer-review'),
            },
            {
              title: 'Scrutiny Workspace',
              description: 'Open the complete review dashboard.',
              action: () => navigate('/scrutinizer'),
            },
          ],
        };
      case 'panel_member':
        return {
          title: 'Panel Dashboard',
          description: 'Track papers under panel consideration and final faculty return.',
          roleLabel: 'Panel Member',
          actions: [
            {
              title: 'Open Panel Dashboard',
              description: 'Monitor papers under review, HOD approval, and faculty return.',
              action: () => navigate('/panel-dashboard'),
            },
            {
              title: 'Question Papers',
              description: 'Browse papers by workflow stage.',
              action: () => navigate('/papers'),
            },
          ],
        };
      case 'hod':
        return {
          title: 'HOD Dashboard',
          description: 'Approve final papers and track completed academic decisions.',
          roleLabel: 'HOD',
          actions: [
            {
              title: 'Open HOD Dashboard',
              description: 'Review pending approvals and completed decisions.',
              action: () => navigate('/hod-dashboard'),
            },
            {
              title: 'Question Papers',
              description: 'Browse the full paper repository by status.',
              action: () => navigate('/papers'),
            },
          ],
        };
      default:
        return {
          title: 'Dashboard',
          description: 'Welcome to the system.',
          roleLabel: 'User',
          actions: [],
        };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="rounded-[28px] border border-slate-200 bg-white shadow-xl overflow-hidden">
          <div className="border-b border-blue-100 bg-[linear-gradient(135deg,#123c8c_0%,#0a2b69_100%)] px-8 py-10 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">SSN College of Engineering</div>
            <h1 className="mt-4 font-serif text-4xl sm:text-5xl">{roleInfo.title}</h1>
            <p className="mt-3 max-w-3xl text-base leading-7 text-blue-50/90">{roleInfo.description}</p>
          </div>

          <div className="p-8">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Profile</div>
                <div className="mt-4 flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-semibold text-slate-900">{user.username}</h2>
                    <p className="mt-1 text-sm text-slate-500">{user.email}</p>
                  </div>
                  <span className="rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-800">
                    {roleInfo.roleLabel}
                  </span>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  {roleInfo.actions.map((action, index) => (
                    <button
                      key={index}
                      onClick={action.action}
                    className="rounded-2xl border border-slate-200 bg-white p-5 text-left transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                    >
                      <h3 className="text-lg font-semibold text-slate-900">{action.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{action.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-3xl border border-slate-200 bg-white p-6">
                  <h3 className="text-xl font-semibold text-slate-900">Notifications</h3>
                  {notifications.length === 0 ? (
                    <p className="mt-4 text-sm text-slate-500">No workflow notifications right now.</p>
                  ) : (
                    <div className="mt-4 space-y-3">
                      {notifications.slice(0, 6).map((item) => (
                        <button
                          key={`${item.paperId}-${item.updatedAt}`}
                          onClick={() => navigate(`/papers/${item.paperId}`)}
                          className="w-full text-left border border-slate-200 rounded-2xl p-4 hover:shadow-sm transition bg-slate-50"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <div className="font-semibold text-slate-800">{item.title}</div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${CATEGORY_STYLES[item.category] || 'bg-gray-100 text-gray-600'}`}>
                                  {item.category || 'update'}
                                </span>
                              </div>
                              <div className="text-sm text-slate-600 mt-1 leading-6">{item.message}</div>
                            </div>
                            <div className="text-xs text-slate-400 whitespace-nowrap">{new Date(item.updatedAt).toLocaleDateString()}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-6">
                  <h3 className="text-xl font-semibold text-slate-900">Operational Overview</h3>
                  <div className="mt-5 grid grid-cols-3 gap-4 text-center">
                    <div className="rounded-2xl bg-white p-4 border border-slate-200">
                      <div className="text-3xl font-semibold text-slate-900">{notifications.length}</div>
                      <div className="mt-1 text-sm text-slate-500">Recent Updates</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4 border border-slate-200">
                      <div className="text-3xl font-semibold text-blue-700">2</div>
                      <div className="mt-1 text-sm text-slate-500">Primary Actions</div>
                    </div>
                    <div className="rounded-2xl bg-white p-4 border border-slate-200">
                      <div className="text-3xl font-semibold text-slate-700">{roleInfo.roleLabel}</div>
                      <div className="mt-1 text-sm text-slate-500">Active Role</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
