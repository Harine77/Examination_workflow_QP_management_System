
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/authContext';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import QuestionPapers from './pages/QuestionPapers';
import CreatePaper from './pages/CreatePaper';
import ScrutinizerMainDashboard from './pages/ScrutinizerMainDashboard';
import ScrutinizerDashboard from './pages/Scrutinizerdashboard';
import HODDashboard from './pages/HODDashboard';
import PanelDashboard from './pages/PanelDashboard';

// Root redirect component that checks auth
function RootRedirect() {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect based on role
  switch(user.role) {
    case 'scrutinizer':
      return <Navigate to="/scrutinizer" replace />;
    case 'hod':
      return <Navigate to="/hod-dashboard" replace />;
    case 'panel':
    case 'panel_member':
      return <Navigate to="/panel-dashboard" replace />;
    case 'faculty':
    default:
      return <Navigate to="/dashboard" replace />;
  }
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />

            {/* Protected Routes */}
            <Route
              path="/dashboard"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />

            <Route
              path="/papers"
              element={
                <PrivateRoute>
                  <QuestionPapers />
                </PrivateRoute>
              }
            />

            <Route
              path="/create-paper"
              element={
                <PrivateRoute allowedRoles={['faculty']}>
                  <CreatePaper />
                </PrivateRoute>
              }
            />

            {/* Scrutinizer Routes */}
            <Route
              path="/scrutinizer"
              element={
                <PrivateRoute allowedRoles={['scrutinizer']}>
                  <ScrutinizerMainDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/scrutinizer-review"
              element={
                <PrivateRoute allowedRoles={['scrutinizer']}>
                  <ScrutinizerDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/scrutinizer-all-papers"
              element={
                <PrivateRoute allowedRoles={['scrutinizer']}>
                  <QuestionPapers />
                </PrivateRoute>
              }
            />
            <Route
              path="/scrutinizer-reviews"
              element={
                <PrivateRoute allowedRoles={['scrutinizer']}>
                  <ScrutinizerDashboard />
                </PrivateRoute>
              }
            />

            {/* HOD Route */}
            <Route
              path="/hod-dashboard"
              element={
                <PrivateRoute allowedRoles={['hod']}>
                  <HODDashboard />
                </PrivateRoute>
              }
            />

            {/* Panel Route */}
            <Route
              path="/panel-dashboard"
              element={
                <PrivateRoute allowedRoles={['panel', 'panel_member']}>
                  <PanelDashboard />
                </PrivateRoute>
              }
            />

            {/* Root: redirect based on auth status */}
            <Route path="/" element={<RootRedirect />} />

            {/* 404 Not Found */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
                <div className="text-center">
                  <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
                  <p className="text-xl text-gray-600">Page Not Found</p>
                </div>
              </div>
            } />
          </Routes>

          <ToastContainer position="top-right" autoClose={3000} />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;