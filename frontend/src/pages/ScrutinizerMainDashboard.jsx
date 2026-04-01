import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';

const ScrutinizerMainDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const actions = [
    {
      title: 'View All Papers',
      description: 'Browse and review all question papers currently in the system.',
      action: () => navigate('/scrutinizer-all-papers'),
    },
    {
      title: 'Papers for Review',
      description: 'Open the list of papers pending scrutiny and feedback.',
      action: () => navigate('/scrutinizer-review'),
    },
    {
      title: 'My Reviews',
      description: 'Review your scrutiny decisions and workflow progress.',
      action: () => navigate('/scrutinizer-reviews'),
    },
  ];

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="rounded-[28px] border border-slate-200 bg-white shadow-xl overflow-hidden mb-10">
          <div className="border-b border-amber-100 bg-[linear-gradient(135deg,#123c8c_0%,#0a2b69_100%)] px-8 py-10 text-white">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-100">SSN College of Engineering</div>
            <h1 className="mt-4 font-serif text-4xl sm:text-5xl">Scrutinizer Dashboard</h1>
            <p className="mt-3 text-base leading-7 text-blue-50/90">Review, verify, and advance question papers through the academic scrutiny process.</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 max-w-3xl mx-auto border border-slate-200">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h3 className="text-xl font-bold text-slate-900">{user?.username}</h3>
              <p className="text-slate-500">{user?.email}</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-bold">
              SCRUTINIZER
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {actions.map((action) => (
            <button
              key={action.title}
              onClick={action.action}
              className="rounded-3xl border border-slate-200 bg-white p-8 text-left shadow-md transition hover:-translate-y-1 hover:border-amber-200 hover:shadow-lg"
            >
              <h3 className="text-2xl font-semibold text-slate-900">{action.title}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-500">{action.description}</p>
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[
            ['Total Papers', '0'],
            ['Approved', '0'],
            ['In Review', '0'],
            ['Flagged', '0'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="text-3xl font-semibold text-slate-900">{value}</div>
              <div className="mt-2 text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
          <h3 className="text-2xl font-semibold text-slate-900">Scrutinizer Responsibilities</h3>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {[
              'Review question papers submitted by faculty members.',
              'Approve questions that meet academic and quality standards.',
              'Provide revision notes when improvements are required.',
              'Ensure alignment with course outcomes and learning objectives.',
            ].map((item) => (
              <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScrutinizerMainDashboard;
