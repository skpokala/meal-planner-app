import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FamilyMembers from './pages/FamilyMembers';
import Meals from './pages/Meals';
import MealPlanner from './pages/MealPlanner';
import MasterData from './pages/MasterData';
import Settings from './pages/Settings';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner />;
  }

  return user ? children : <Navigate to="/login" />;
};

// Main App Routes
function AppRoutes() {
  const { user } = useAuth();

  return (
    <ErrorBoundary>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/dashboard" /> : <Login />}
        />
        <Route
          path="/"
          element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />}
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <ErrorBoundary>
                  <Dashboard />
                </ErrorBoundary>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/family-members"
          element={
            <ProtectedRoute>
              <Layout>
                <ErrorBoundary>
                  <FamilyMembers />
                </ErrorBoundary>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/meals"
          element={
            <ProtectedRoute>
              <Layout>
                <ErrorBoundary>
                  <Meals />
                </ErrorBoundary>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/meal-planner"
          element={
            <ProtectedRoute>
              <Layout>
                <ErrorBoundary>
                  <MealPlanner />
                </ErrorBoundary>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/master-data"
          element={
            <ProtectedRoute>
              <Layout>
                <ErrorBoundary>
                  <MasterData />
                </ErrorBoundary>
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <ErrorBoundary>
                  <Settings />
                </ErrorBoundary>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <div className="App">
              <AppRoutes />
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 4000,
                  className: 'dark:!bg-secondary-800 dark:!text-secondary-100',
                  style: {
                    background: 'rgb(var(--color-secondary-800))',
                    color: 'rgb(var(--color-secondary-100))',
                  },
                  success: {
                    className: 'dark:!bg-success-600',
                    style: {
                      background: 'rgb(var(--color-success-600))',
                    },
                  },
                  error: {
                    className: 'dark:!bg-error-600',
                    style: {
                      background: 'rgb(var(--color-error-600))',
                    },
                  },
                }}
              />
            </div>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App; 