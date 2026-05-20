import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from './context/AuthContext';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import MemberDashboard from './pages/MemberDashboard';
import AdminDashboard from './pages/AdminDashboard';
import AdminAddProblem from './pages/AdminAddProblem';
import AdminAddMCQ from './pages/AdminAddMCQ';
import AdminAddSQL from './pages/AdminAddSQL';
import ProblemPage from './pages/ProblemPage';
import QuizPage from './pages/QuizPage';
import SQLPage from './pages/SQLPage';
import ResourcesHub from './pages/ResourcesHub';
import AdminAddMockTest from './pages/AdminAddMockTest';
import MockExam from './pages/MockExam';
import ActiveMockTest from './pages/ActiveMockTest';
import MockTestResult from './pages/MockTestResult';
import AdminProctoring from './pages/AdminProctoring';

const PrivateRoute = ({ children, roleRequired }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div className="min-h-screen flex items-center justify-center text-white">Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (roleRequired && user.role !== roleRequired) {
    if (user.role === 'admin' && roleRequired === 'member') {
      // Allow admins to view member pages for testing
    } else {
      return <Navigate to={user.role === 'admin' ? '/admin' : '/dashboard'} />;
    }
  }
  return children;
};

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-transparent">
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          
          <Route path="/dashboard" element={
            <PrivateRoute roleRequired="member">
              <MemberDashboard />
            </PrivateRoute>
          } />

          <Route path="/resources" element={
            <PrivateRoute roleRequired="member">
              <ResourcesHub />
            </PrivateRoute>
          } />
          
          <Route path="/problem/:id" element={
            <PrivateRoute roleRequired="member">
              <ProblemPage />
            </PrivateRoute>
          } />

          <Route path="/quiz/:id" element={
            <PrivateRoute roleRequired="member">
              <QuizPage />
            </PrivateRoute>
          } />

          <Route path="/sql/:id" element={
            <PrivateRoute roleRequired="member">
              <SQLPage />
            </PrivateRoute>
          } />

          <Route path="/admin" element={
            <PrivateRoute roleRequired="admin">
              <AdminDashboard />
            </PrivateRoute>
          } />

          <Route path="/admin/problems/new" element={
            <PrivateRoute roleRequired="admin">
              <AdminAddProblem />
            </PrivateRoute>
          } />

          <Route path="/admin/problems/edit/:id" element={
            <PrivateRoute roleRequired="admin">
              <AdminAddProblem />
            </PrivateRoute>
          } />

          <Route path="/admin/mcqs/new" element={
            <PrivateRoute roleRequired="admin">
              <AdminAddMCQ />
            </PrivateRoute>
          } />

          <Route path="/admin/mcqs/edit/:id" element={
            <PrivateRoute roleRequired="admin">
              <AdminAddMCQ />
            </PrivateRoute>
          } />

          <Route path="/admin/sqls/new" element={
            <PrivateRoute roleRequired="admin">
              <AdminAddSQL />
            </PrivateRoute>
          } />

          <Route path="/admin/sqls/edit/:id" element={
            <PrivateRoute roleRequired="admin">
              <AdminAddSQL />
            </PrivateRoute>
          } />

          <Route path="/admin/mock-tests/new" element={
            <PrivateRoute roleRequired="admin">
              <AdminAddMockTest />
            </PrivateRoute>
          } />

          <Route path="/admin/mock-tests/edit/:id" element={
            <PrivateRoute roleRequired="admin">
              <AdminAddMockTest />
            </PrivateRoute>
          } />

          <Route path="/admin/proctoring" element={
            <PrivateRoute roleRequired="admin">
              <AdminProctoring />
            </PrivateRoute>
          } />
          
          <Route path="/mock-exam" element={
            <PrivateRoute roleRequired="member">
              <MockExam />
            </PrivateRoute>
          } />

          <Route path="/mock-exam/active/:id" element={
            <PrivateRoute roleRequired="member">
              <ActiveMockTest />
            </PrivateRoute>
          } />

          <Route path="/mock-results/:id" element={
            <PrivateRoute roleRequired="member">
              <MockTestResult />
            </PrivateRoute>
          } />

        </Routes>
      </div>
    </Router>
  );
}

export default App;
