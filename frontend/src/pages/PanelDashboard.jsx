import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';

const PanelDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="text-7xl mb-4">👥</div>
          <h1 className="text-5xl font-bold text-gray-800 mb-3">
            Panel Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            View question papers (Read-only access)
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{user?.username}</h3>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-yellow-100 text-yellow-700 font-bold">
              PANEL
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/papers')}
            className="bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl p-8 shadow-lg transform hover:scale-105 transition-all text-left"
          >
            <div className="text-5xl mb-4">👁️</div>
            <h3 className="text-2xl font-bold mb-2">View All Papers</h3>
            <p className="text-sm opacity-90">Browse all question papers in the system</p>
          </button>

          <button
            onClick={() => navigate('/papers?status=finalized')}
            className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl p-8 shadow-lg transform hover:scale-105 transition-all text-left"
          >
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-2xl font-bold mb-2">Finalized Papers</h3>
            <p className="text-sm opacity-90">View approved and finalized question papers</p>
          </button>
        </div>

        {/* Statistics Section */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Overview</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-yellow-50 rounded-lg">
              <div className="text-3xl font-bold text-yellow-600">0</div>
              <div className="text-sm text-gray-600">Total Papers</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">In Review</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">Finalized</div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-12 bg-gradient-to-r from-yellow-500 to-amber-500 text-white rounded-xl p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-2">Panel Access Rights</h3>
          <ul className="list-disc list-inside space-y-2 text-opacity-90">
            <li>View all question papers in the system</li>
            <li>Access finalized and approved papers</li>
            <li>Read-only access - no modifications allowed</li>
            <li>Monitor paper review and approval status</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default PanelDashboard;
