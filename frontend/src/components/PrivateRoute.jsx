import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-indigo-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-100 border border-red-400 text-red-700 px-6 py-4 rounded">
          <h2 className="text-xl font-bold mb-2">Access Denied</h2>
          <p>You don't have permission to access this page.</p>
          <p className="mt-2">Your role: <strong>{user.role}</strong></p>
        </div>
      </div>
    );
  }

  return children;
};

export default PrivateRoute;