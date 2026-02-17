import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';

// Pages
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import QuestionPapers from './pages/QuestionPapers';
import CreatePaper from './pages/CreatePaper';
import ScrutinizerDashboard from './pages/Scrutinizerdashboard';

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

            {/* Scrutinizer Route */}
            <Route
              path="/scrutinizer"
              element={
                <PrivateRoute allowedRoles={['scrutinizer']}>
                  <ScrutinizerDashboard />
                </PrivateRoute>
              }
            />

            {/* Redirect root to dashboard or login */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

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