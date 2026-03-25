import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const getRoleInfo = () => {
    switch (user.role) {
      case 'faculty':
        return {
          title: 'Faculty Dashboard',
          description: 'Create and manage your question papers',
          color: 'blue',
          icon: '👨‍🏫',
          actions: [
            {
              title: 'Create Question Paper',
              description: 'Start creating a new question paper with CO/KL mapping',
              icon: '📝',
              action: () => navigate('/create-paper'),
              bgColor: 'bg-blue-500',
              hoverColor: 'hover:bg-blue-600'
            },
            {
              title: 'My Question Papers',
              description: 'View and edit your submitted question papers',
              icon: '📋',
              action: () => navigate('/papers'),
              bgColor: 'bg-indigo-500',
              hoverColor: 'hover:bg-indigo-600'
            }
          ]
        };
      case 'scrutinizer':
      case 'scrutinizer_1':
        return {
          title: 'Scrutinizer 1 Dashboard',
          description: 'Review submitted papers and pass them to Scrutinizer 2',
          color: 'green',
          icon: '🔍',
          actions: [
            {
              title: 'Papers to Review',
              description: 'View papers submitted by faculty waiting for your review',
              icon: '📑',
              action: () => navigate('/scrutinizer-review'),
              bgColor: 'bg-green-500',
              hoverColor: 'hover:bg-green-600'
            },
            {
              title: 'Review Dashboard',
              description: 'Open the full paper review and comparison interface',
              icon: '📚',
              action: () => navigate('/scrutinizer'),
              bgColor: 'bg-teal-500',
              hoverColor: 'hover:bg-teal-600'
            }
          ]
        };
      case 'scrutinizer_2':
        return {
          title: 'Scrutinizer 2 Dashboard',
          description: 'Approve or send back papers reviewed by Scrutinizer 1',
          color: 'green',
          icon: '✅',
          actions: [
            {
              title: 'Papers Awaiting Approval',
              description: 'View papers passed by Scrutinizer 1',
              icon: '📑',
              action: () => navigate('/scrutinizer-review'),
              bgColor: 'bg-emerald-500',
              hoverColor: 'hover:bg-emerald-600'
            },
            {
              title: 'Review Dashboard',
              description: 'Open the full paper review interface',
              icon: '📚',
              action: () => navigate('/scrutinizer'),
              bgColor: 'bg-green-600',
              hoverColor: 'hover:bg-green-700'
            }
          ]
        };
      case 'panel_member':
        return {
          title: 'Panel Member Dashboard',
          description: 'View question papers (Read-only access)',
          color: 'yellow',
          icon: '👥',
          actions: [
            {
              title: 'View All Papers',
              description: 'Browse all question papers',
              icon: '👁️',
              action: () => navigate('/papers'),
              bgColor: 'bg-yellow-500',
              hoverColor: 'hover:bg-yellow-600'
            },
            {
              title: 'Finalized Papers',
              description: 'View approved question papers',
              icon: '✅',
              action: () => navigate('/papers?status=finalized'),
              bgColor: 'bg-amber-500',
              hoverColor: 'hover:bg-amber-600'
            }
          ]
        };
      case 'hod':
        return {
          title: 'HOD Dashboard',
          description: 'Finalize and approve question papers',
          color: 'purple',
          icon: '👔',
          actions: [
            {
              title: 'Papers to Finalize',
              description: 'Review papers ready for final approval',
              icon: '✅',
              action: () => navigate('/papers?status=reviewed'),
              bgColor: 'bg-purple-500',
              hoverColor: 'hover:bg-purple-600'
            },
            {
              title: 'All Question Papers',
              description: 'View complete paper repository',
              icon: '📚',
              action: () => navigate('/papers'),
              bgColor: 'bg-violet-500',
              hoverColor: 'hover:bg-violet-600'
            }
          ]
        };
      default:
        return {
          title: 'Dashboard',
          description: 'Welcome to the system',
          color: 'gray',
          icon: '📊',
          actions: []
        };
    }
  };

  const roleInfo = getRoleInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="text-7xl mb-4">{roleInfo.icon}</div>
          <h1 className="text-5xl font-bold text-gray-800 mb-3">
            {roleInfo.title}
          </h1>
          <p className="text-xl text-gray-600">
            {roleInfo.description}
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{user.username}</h3>
              <p className="text-gray-600">{user.email}</p>
            </div>
            <div className={`px-4 py-2 rounded-full bg-${roleInfo.color}-100 text-${roleInfo.color}-700 font-bold`}>
              {user.role.replace('_', ' ').toUpperCase()}
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {roleInfo.actions.map((action, index) => (
            <button
              key={index}
              onClick={action.action}
              className={`${action.bgColor} ${action.hoverColor} text-white rounded-xl p-8 shadow-lg transform hover:scale-105 transition-all text-left`}
            >
              <div className="text-5xl mb-4">{action.icon}</div>
              <h3 className="text-2xl font-bold mb-2">{action.title}</h3>
              <p className="text-sm opacity-90">{action.description}</p>
            </button>
          ))}
        </div>

        {/* Quick Stats */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Quick Overview</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">Total Papers</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">0</div>
              <div className="text-sm text-gray-600">Completed</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;