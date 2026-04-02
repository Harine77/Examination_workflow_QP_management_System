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
import AICreatePaper from './pages/AICreatePaper';
import EditPaper from './pages/EditPaper';
import ScrutinizerMainDashboard from './pages/ScrutinizerMainDashboard';
import ScrutinizerDashboard from './pages/Scrutinizerdashboard';
import ScrutinizerFinalPaper from './pages/Scrutinizerfinalpaper';
import HODDashboard from './pages/HODDashboardV2';
import PanelDashboard from './pages/PanelDashboardV2';
import HODPapers from './pages/HODPapers';
import PanelPapers from './pages/PanelPapers';
import PanelAwaitingReview from './pages/PanelAwaitingReview';
import PanelSubmittedToHOD from './pages/PanelSubmittedToHOD';
import PanelHODApproved from './pages/PanelHODApproved';
import PanelReturned from './pages/PanelReturned';
import PaperView from './pages/PaperView';
import RequestCourseEnrollment from './pages/RequestCourseEnrollment';

// Root redirect component that checks auth
function RootRedirect() {
  const { user } = useAuth();
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Redirect based on role
  switch(user.role) {
    case 'scrutinizer':
    case 'scrutinizer_1':
    case 'scrutinizer_2':
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
              path="/papers/:id"
              element={
                <PrivateRoute>
                  <PaperView />
                </PrivateRoute>
              }
            />

            <Route path="/create-paper" element={<PrivateRoute allowedRoles={['faculty']}><CreatePaper /></PrivateRoute>} />
            <Route path="/ai-create-paper" element={<PrivateRoute allowedRoles={['faculty']}><AICreatePaper /></PrivateRoute>} />
            <Route path="/papers/:id/edit" element={<PrivateRoute allowedRoles={['faculty']}><EditPaper /></PrivateRoute>} />
            <Route path="/request-courses" element={<PrivateRoute allowedRoles={['faculty', 'scrutinizer_1']}><RequestCourseEnrollment /></PrivateRoute>} />

            {/* Scrutinizer Routes */}
            <Route
              path="/scrutinizer"
              element={
                <PrivateRoute allowedRoles={['scrutinizer', 'scrutinizer_1', 'scrutinizer_2']}>
                  <ScrutinizerMainDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/scrutinizer-review"
              element={
                <PrivateRoute allowedRoles={['scrutinizer', 'scrutinizer_1', 'scrutinizer_2']}>
                  <ScrutinizerDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/scrutinizer-all-papers"
              element={
                <PrivateRoute allowedRoles={['scrutinizer', 'scrutinizer_1', 'scrutinizer_2']}>
                  <QuestionPapers />
                </PrivateRoute>
              }
            />
            <Route
              path="/scrutinizer-reviews"
              element={
                <PrivateRoute allowedRoles={['scrutinizer', 'scrutinizer_1', 'scrutinizer_2']}>
                  <ScrutinizerDashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/scrutinizer-final-paper"
              element={
                <PrivateRoute allowedRoles={['scrutinizer']}>
                  <ScrutinizerFinalPaper />
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
            <Route
              path="/hod-papers"
              element={
                <PrivateRoute allowedRoles={['hod']}>
                  <HODPapers />
                </PrivateRoute>
              }
            />

            {/* Panel Routes */}
            <Route path="/panel-dashboard" element={<PrivateRoute allowedRoles={['panel', 'panel_member']}><PanelDashboard /></PrivateRoute>} />
            <Route path="/panel-papers"    element={<PrivateRoute allowedRoles={['panel', 'panel_member']}><PanelPapers /></PrivateRoute>} />
            <Route path="/panel/awaiting-review" element={<PrivateRoute allowedRoles={['panel', 'panel_member']}><PanelAwaitingReview /></PrivateRoute>} />
            <Route path="/panel/submitted-to-hod" element={<PrivateRoute allowedRoles={['panel', 'panel_member']}><PanelSubmittedToHOD /></PrivateRoute>} />
            <Route path="/panel/hod-approved" element={<PrivateRoute allowedRoles={['panel', 'panel_member']}><PanelHODApproved /></PrivateRoute>} />
            <Route path="/panel/returned" element={<PrivateRoute allowedRoles={['panel', 'panel_member']}><PanelReturned /></PrivateRoute>} />

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
