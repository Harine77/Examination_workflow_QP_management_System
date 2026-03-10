import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';

const HODDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <div className="text-7xl mb-4">👔</div>
          <h1 className="text-5xl font-bold text-gray-800 mb-3">
            HOD Dashboard
          </h1>
          <p className="text-xl text-gray-600">
            Finalize and approve question papers
          </p>
        </div>

        {/* User Info Card */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{user?.username}</h3>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-purple-100 text-purple-700 font-bold">
              HOD
            </div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
          <button
            onClick={() => navigate('/papers?status=reviewed')}
            className="bg-purple-500 hover:bg-purple-600 text-white rounded-xl p-8 shadow-lg transform hover:scale-105 transition-all text-left"
          >
            <div className="text-5xl mb-4">✅</div>
            <h3 className="text-2xl font-bold mb-2">Papers to Finalize</h3>
            <p className="text-sm opacity-90">Review papers ready for final approval from scrutinizer</p>
          </button>

          <button
            onClick={() => navigate('/papers')}
            className="bg-violet-500 hover:bg-violet-600 text-white rounded-xl p-8 shadow-lg transform hover:scale-105 transition-all text-left"
          >
            <div className="text-5xl mb-4">📚</div>
            <h3 className="text-2xl font-bold mb-2">All Question Papers</h3>
            <p className="text-sm opacity-90">View complete paper repository and history</p>
          </button>
        </div>

        {/* Statistics Section */}
        <div className="mt-12 bg-white rounded-xl shadow-lg p-6 max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Statistics</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 bg-purple-50 rounded-lg">
              <div className="text-3xl font-bold text-purple-600">0</div>
              <div className="text-sm text-gray-600">Total Papers</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg">
              <div className="text-3xl font-bold text-blue-600">0</div>
              <div className="text-sm text-gray-600">Pending Finalization</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg">
              <div className="text-3xl font-bold text-green-600">0</div>
              <div className="text-sm text-gray-600">Finalized</div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="mt-12 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-xl p-8 max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold mb-2">HOD Responsibilities</h3>
          <ul className="list-disc list-inside space-y-2 text-opacity-90">
            <li>Review question papers that have been scrutinized</li>
            <li>Approve or request modifications to papers</li>
            <li>Finalize papers for exam administration</li>
            <li>Maintain academic quality standards</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default HODDashboard;
