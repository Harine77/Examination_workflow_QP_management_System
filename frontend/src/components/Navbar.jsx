import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'faculty':
        return 'bg-blue-600';
      case 'scrutinizer':
        return 'bg-green-600';
      case 'panel_member':
        return 'bg-yellow-600';
      case 'hod':
        return 'bg-purple-600';
      default:
        return 'bg-gray-600';
    }
  };

  return (
    <nav className="bg-indigo-700 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <span className="text-2xl">📝</span>
            <span className="text-xl font-bold">Question Paper System</span>
          </Link>

          {/* User Info */}
          {user && (
            <div className="flex items-center space-x-6">
              {/* Navigation Links */}
              <Link 
                to="/dashboard" 
                className="hover:text-indigo-200 transition-colors"
              >
                Dashboard
              </Link>
              <Link 
                to="/papers" 
                className="hover:text-indigo-200 transition-colors"
              >
                Question Papers
              </Link>

              {/* User Badge */}
              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <div className="font-semibold">{user.username}</div>
                  <div className="text-xs text-indigo-200">{user.email}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${getRoleBadgeColor(user.role)}`}>
                  {user.role.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;