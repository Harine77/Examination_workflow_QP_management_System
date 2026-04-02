import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';

// Professional Icons as SVG components
const Icons = {
  create: () => (
    <svg className="w-8 h-8 text-ssn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  ),
  files: () => (
    <svg className="w-8 h-8 text-ssn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  review: () => (
    <svg className="w-8 h-8 text-ssn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  approve: () => (
    <svg className="w-8 h-8 text-ssn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  view: () => (
    <svg className="w-8 h-8 text-ssn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  ),
  panel: () => (
    <svg className="w-8 h-8 text-ssn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 8.646 4 4 0 010-8.646M9 9H5m14 0h-4M9 9a7 7 0 1114 0m-7 7v3m-3 0h6" />
    </svg>
  ),
  finalize: () => (
    <svg className="w-8 h-8 text-ssn-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7 20H5a2 2 0 01-2-2V5a2 2 0 012-2h14a2 2 0 012 2v14a2 2 0 01-2 2h-2m-4-6l2.293-2.293a1 1 0 111.414 1.414L12 16.414l4.293-4.293a1 1 0 111.414 1.414L13.414 17.828" />
    </svg>
  ),
};

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getRoleInfo = () => {
    switch (user.role) {
      case 'faculty':
        return {
          title: 'Faculty Dashboard',
          description: 'Create and manage question papers with CO and KL mappings',
          icon: Icons.create,
          actions: [
            {
              title: 'Create Question Paper',
              description: 'Begin creating a new question paper with comprehensive CO/KL mapping',
              icon: Icons.create,
              action: () => navigate('/create-paper'),
            },
            {
              title: 'My Question Papers',
              description: 'View, edit, and manage all your submitted question papers',
              icon: Icons.files,
              action: () => navigate('/papers'),
            }
          ]
        };
      case 'scrutinizer':
      case 'scrutinizer_1':
        return {
          title: 'Scrutinizer 1 - Technical Review',
          description: 'Review papers for technical quality and pass to Scrutinizer 2',
          icon: Icons.review,
          actions: [
            {
              title: 'Papers for Review',
              description: 'Review submitted papers for technical accuracy and compliance',
              icon: Icons.review,
              action: () => navigate('/scrutinizer-review'),
            },
            {
              title: 'Review Interface',
              description: 'Access the comprehensive paper review and comparison tools',
              icon: Icons.files,
              action: () => navigate('/scrutinizer'),
            }
          ]
        };
      case 'scrutinizer_2':
        return {
          title: 'Scrutinizer 2 - Final Review',
          description: 'Final review and approval of papers reviewed by Scrutinizer 1',
          icon: Icons.approve,
          actions: [
            {
              title: 'Awaiting Approval',
              description: 'Review and approve papers passed by Scrutinizer 1',
              icon: Icons.review,
              action: () => navigate('/scrutinizer-review'),
            },
            {
              title: 'Review Dashboard',
              description: 'Access the full paper analysis and comparison interface',
              icon: Icons.files,
              action: () => navigate('/scrutinizer'),
            }
          ]
        };
      case 'panel_member':
      case 'panel':
        return {
          title: 'Panel Member - Review',
          description: 'Review and provide feedback on finalized question papers',
          icon: Icons.panel,
          actions: [
            {
              title: 'All Papers',
              description: 'View all finalized question papers in the system',
              icon: Icons.view,
              action: () => navigate('/papers'),
            },
            {
              title: 'Approved Papers',
              description: 'View papers that have been approved by HOD',
              icon: Icons.approve,
              action: () => navigate('/papers?status=finalized'),
            }
          ]
        };
      case 'hod':
        return {
          title: 'HOD - Final Approval',
          description: 'Generate final approval and release question papers',
          icon: Icons.finalize,
          actions: [
            {
              title: 'Ready for Approval',
              description: 'Review and approve papers ready for final release',
              icon: Icons.approve,
              action: () => navigate('/papers?status=reviewed'),
            },
            {
              title: 'All Papers',
              description: 'Access complete paper repository and approval history',
              icon: Icons.files,
              action: () => navigate('/papers'),
            }
          ]
        };
      default:
        return {
          title: 'Dashboard',
          description: 'Welcome to SSN Engineering College Exam Management System',
          icon: Icons.files,
          actions: []
        };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header Section */}
        <div className="mb-12">
          <div className="flex items-center gap-6 mb-4">
            <div className="flex items-center justify-center w-16 h-16 bg-ssn-light rounded-xl border-2 border-ssn-blue">
              {roleInfo.icon()}
            </div>
            <div>
              <h1 className="text-4xl font-bold text-ssn-dark mb-2">{roleInfo.title}</h1>
              <p className="text-lg text-gray-600 font-normal">{roleInfo.description}</p>
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-3 gap-8">
          {/* Left Column - Quick Actions */}
          <div className="col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {roleInfo.actions.map((action, index) => (
                <button
                  key={index}
                  onClick={action.action}
                  className="group card card-hover p-8 text-left border-l-4 border-ssn-blue hover:border-ssn-dark transition-all"
                >
                  <div className="flex items-start gap-4 mb-4">
                    <div className="flex-shrink-0 w-12 h-12 bg-ssn-light rounded-lg flex items-center justify-center group-hover:bg-ssn-blue group-hover:text-white transition-all">
                      {action.icon()}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-ssn-dark mb-2">{action.title}</h3>
                  <p className="text-gray-600 leading-relaxed text-sm font-normal">{action.description}</p>
                  <div className="mt-4 text-ssn-blue font-semibold group-hover:translate-x-2 transition-transform text-sm">
                    → Proceed
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Column - User Info */}
          <div>
            <div className="card p-8 sticky top-32">
              <h3 className="text-lg font-semibold text-ssn-dark mb-4 pb-4 border-b-2 border-ssn-blue">User Profile</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Name</p>
                  <p className="text-lg font-semibold text-gray-900 mt-1">{user.username}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Email</p>
                  <p className="text-sm text-gray-700 mt-1 font-normal">{user.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Role</p>
                  <span className="badge badge-blue text-base px-4 py-2 font-semibold">
                    {user.role.replace(/_/g, ' ').toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Section */}
        <div className="mt-16">
          <h2 className="text-2xl font-semibold text-ssn-dark mb-6">Overview Metrics</h2>
          <div className="grid grid-cols-3 gap-6">
            <div className="card p-6 border-l-4 border-blue-500">
              <div className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2">Total Papers</div>
              <div className="text-4xl font-bold text-ssn-blue">0</div>
              <p className="text-xs text-gray-500 mt-2 font-normal">in the system</p>
            </div>
            <div className="card p-6 border-l-4 border-amber-500">
              <div className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2">Pending Items</div>
              <div className="text-4xl font-bold text-amber-600">0</div>
              <p className="text-xs text-gray-500 mt-2 font-normal">awaiting action</p>
            </div>
            <div className="card p-6 border-l-4 border-green-500">
              <div className="text-gray-600 text-xs font-semibold uppercase tracking-wider mb-2">Completed</div>
              <div className="text-4xl font-bold text-green-600">0</div>
              <p className="text-xs text-gray-500 mt-2 font-normal">successfully</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;