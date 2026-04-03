import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';

const ROLE_CONFIG = {
  faculty: {
    title: 'Faculty Dashboard',
    accent: 'border-blue-500',
    actions: [
      { title: 'AI Generate Paper', description: 'Enter syllabus and let AI generate questions for you — confirm each one.', path: '/ai-create-paper', color: 'bg-blue-700 hover:bg-blue-800' },
      { title: 'Create Manually', description: 'Type your own questions with CO and KL mapping.', path: '/create-paper', color: 'bg-slate-600 hover:bg-slate-700' },
      { title: 'My Papers', description: 'View and track all your submitted papers.', path: '/papers', color: 'bg-slate-700 hover:bg-slate-800' },
      { title: 'Request Courses', description: 'Request enrollment in courses to create question papers.', path: '/request-courses', color: 'bg-amber-600 hover:bg-amber-700' },
    ],
  },
  scrutinizer: {
    title: 'Scrutinizer Dashboard',
    accent: 'border-emerald-500',
    actions: [
      { title: 'Papers for Review', description: 'Open papers pending scrutiny.', path: '/scrutinizer-review', color: 'bg-emerald-700 hover:bg-emerald-800' },
      { title: 'All Papers', description: 'Browse all papers in the system.', path: '/scrutinizer-all-papers', color: 'bg-slate-700 hover:bg-slate-800' },
    ],
  },
  scrutinizer_1: {
    title: 'Scrutinizer 1 Dashboard',
    accent: 'border-emerald-500',
    actions: [
      { title: 'Papers for Review', description: 'Open papers pending first scrutiny.', path: '/scrutinizer-review', color: 'bg-emerald-700 hover:bg-emerald-800' },
      { title: 'All Papers', description: 'Browse all papers in the system.', path: '/scrutinizer-all-papers', color: 'bg-slate-700 hover:bg-slate-800' },
    ],
  },
  scrutinizer_2: {
    title: 'Scrutinizer 2 Dashboard',
    accent: 'border-emerald-500',
    actions: [
      { title: 'Papers for Review', description: 'Papers passed by Scrutinizer 1.', path: '/scrutinizer-review', color: 'bg-emerald-700 hover:bg-emerald-800' },
      { title: 'All Papers', description: 'Browse all papers in the system.', path: '/scrutinizer-all-papers', color: 'bg-slate-700 hover:bg-slate-800' },
    ],
  },
  panel_member: {
    title: 'Panel Member Dashboard',
    accent: 'border-blue-500',
    actions: [
      { title: 'Papers for Review', description: 'View and manage papers across all panel stages.', path: '/panel-papers', color: 'bg-blue-700 hover:bg-blue-800' },
      { title: 'All Papers', description: 'Browse all papers in the system.', path: '/papers', color: 'bg-slate-700 hover:bg-slate-800' },
    ],
  },
  panel: {
    title: 'Panel Member Dashboard',
    accent: 'border-blue-500',
    actions: [
      { title: 'Papers for Review', description: 'View and manage papers across all panel stages.', path: '/panel-papers', color: 'bg-blue-700 hover:bg-blue-800' },
      { title: 'All Papers', description: 'Browse all papers in the system.', path: '/papers', color: 'bg-slate-700 hover:bg-slate-800' },
    ],
  },
  hod: {
    title: 'HOD Dashboard',
    accent: 'border-purple-500',
    actions: [
      { title: 'Pending Approvals', description: 'Review papers waiting for your decision.', path: '/hod-papers', color: 'bg-purple-700 hover:bg-purple-800' },
      { title: 'All Papers', description: 'Browse the full paper repository.', path: '/papers', color: 'bg-slate-700 hover:bg-slate-800' },
    ],
  },
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const config = ROLE_CONFIG[user.role] || { title: 'Dashboard', accent: 'border-slate-500', actions: [] };

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Header */}
        <div className={`rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white px-8 py-10 mb-10 border-b-4 ${config.accent}`}>
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-2">SSN College of Engineering</p>
          <h1 className="text-4xl font-bold">Welcome, {user.username}</h1>
          <p className="text-slate-300 mt-2 text-sm">
            {user.email} · <span className="font-semibold text-white">{config.title}</span>
          </p>
        </div>

        {/* Action Cards */}
        <div className={`grid grid-cols-1 gap-5 ${config.actions.length === 4 ? 'sm:grid-cols-2' : config.actions.length >= 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
          {config.actions.map((action) => (
            <button key={action.path} onClick={() => navigate(action.path)}
              className={`${action.color} text-white rounded-xl p-7 text-left shadow-sm transition-all hover:shadow-lg hover:-translate-y-0.5`}>
              <h3 className="text-xl font-bold mb-2">{action.title}</h3>
              <p className="text-sm opacity-80 leading-6">{action.description}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
