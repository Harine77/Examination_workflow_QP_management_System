import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import NotificationBell from './NotificationBell';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'faculty':
        return 'bg-blue-100 text-blue-700';
      case 'scrutinizer':
      case 'scrutinizer_1':
        return 'bg-green-100 text-green-700';
      case 'scrutinizer_2':
        return 'bg-emerald-100 text-emerald-700';
      case 'panel':
      case 'panel_member':
        return 'bg-purple-100 text-purple-700';
      case 'hod':
        return 'bg-amber-100 text-amber-700';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };

  return (
    <nav className="bg-white border-b-2 border-ssn-blue shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo & College Name */}
          <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
            <div className="w-12 h-12 bg-ssn-blue rounded-lg flex items-center justify-center text-white font-bold text-xl">
              SSN
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold text-ssn-dark">SSN Engineering</span>
              <span className="text-xs text-gray-600">Exam Management</span>
            </div>
          </Link>

          {/* User Section */}
          {user && (
            <div className="flex items-center gap-8">
              {/* Notifications */}
              {['scrutinizer_2', 'scrutinizer', 'scrutinizer_1', 'panel_member', 'panel'].includes(user.role) && (
                <NotificationBell />
              )}

              {/* Divider */}
              <div className="h-8 w-px bg-gray-300"></div>

              {/* User Info & Role */}
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <div className="font-semibold text-gray-800">{user.username}</div>
                  <div className="text-xs text-gray-500">{user.email}</div>
                </div>
                <span className={`badge ${getRoleBadgeStyle(user.role)}`}>
                  {user.role.replace(/_/g, ' ').toUpperCase()}
                </span>
              </div>

              {/* Logout Button */}
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-all text-sm"
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