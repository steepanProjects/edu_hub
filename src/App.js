import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './components/auth/Login';
import Signup from './components/auth/Signup';
import Dashboard from './components/Dashboard';
import Classroom from './components/Classroom';
import AssignmentDetail from './components/AssignmentDetail';
import QuizTaking from './components/QuizTaking';
import QuizResult from './components/QuizResult';
import { useLocation, Link } from 'react-router-dom';
import { Home } from 'lucide-react';

function PrivateRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? children : <Navigate to="/login" />;
}

function PublicRoute({ children }) {
  const { currentUser } = useAuth();
  return currentUser ? <Navigate to="/dashboard" /> : children;
}

function App() {
  // Initialize theme once at app mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('theme');
      const isDark = saved === 'dark';
      document.documentElement.classList.toggle('dark', isDark);
    } catch {}
  }, []);

  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            <Route 
              path="/login" 
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              } 
            />
            <Route 
              path="/signup" 
              element={
                <PublicRoute>
                  <Signup />
                </PublicRoute>
              } 
            />
            <Route 
              path="/dashboard" 
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/classroom/:classroomId" 
              element={
                <PrivateRoute>
                  <Classroom />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/assignment/:assignmentId" 
              element={
                <PrivateRoute>
                  <AssignmentDetail />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/quiz/:quizId" 
              element={
                <PrivateRoute>
                  <QuizTaking />
                </PrivateRoute>
              } 
            />
            <Route 
              path="/quiz-result/:attemptId" 
              element={
                <PrivateRoute>
                  <QuizResult />
                </PrivateRoute>
              } 
            />
            <Route path="/" element={<Navigate to="/dashboard" />} />
          </Routes>
          <HomeFab />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;

function HomeFab() {
  const location = useLocation();
  // Hide on Dashboard route
  const hidden = location.pathname === '/dashboard' || location.pathname === '/login' || location.pathname === '/signup';
  if (hidden) return null;
  return (
    <Link
      to="/dashboard"
      title="Home"
      className="fixed right-6 bottom-6 z-50 h-12 w-12 rounded-full bg-primary-600 text-white shadow-lg hover:bg-primary-700 focus:outline-none flex items-center justify-center border border-primary-700"
    >
      <Home className="h-6 w-6" />
    </Link>
  );
}
