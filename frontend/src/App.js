import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { StoresProvider } from './contexts/StoresContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FamilyMembers from './pages/FamilyMembers';
import Meals from './pages/Meals';
import MealPlanner from './pages/MealPlanner';
import MasterData from './pages/MasterData';
import Settings from './pages/Settings';
import Audit from './pages/Audit';
import ReleaseNotesHistory from './pages/ReleaseNotesHistory';
import BugManagement from './pages/BugManagement';
import BackupManagement from './pages/BackupManagement';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import ReleaseNotesWrapper from './components/ReleaseNotesWrapper';
import './index.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ThemeProvider>
          <StoresProvider>
            <Router>
            <ReleaseNotesWrapper>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
                <Route path="/dashboard" element={<ProtectedRoute><Layout><Dashboard /></Layout></ProtectedRoute>} />
                <Route path="/family-members" element={<ProtectedRoute requireAdmin={true}><Layout><FamilyMembers /></Layout></ProtectedRoute>} />
                <Route path="/meals" element={<ProtectedRoute><Layout><Meals /></Layout></ProtectedRoute>} />
                <Route path="/meal-planner" element={<ProtectedRoute><Layout><MealPlanner /></Layout></ProtectedRoute>} />
                <Route path="/master-data" element={<ProtectedRoute><Layout><MasterData /></Layout></ProtectedRoute>} />
                <Route path="/audit" element={<ProtectedRoute requireAdmin={true}><Layout><Audit /></Layout></ProtectedRoute>} />
                <Route path="/release-notes" element={<ProtectedRoute requireAdmin={true}><Layout><ReleaseNotesHistory /></Layout></ProtectedRoute>} />
                <Route path="/bugs" element={<ProtectedRoute><Layout><BugManagement /></Layout></ProtectedRoute>} />
                <Route path="/backup" element={<ProtectedRoute requireAdmin={true}><Layout><BackupManagement /></Layout></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Layout><Settings /></Layout></ProtectedRoute>} />
              </Routes>
            </ReleaseNotesWrapper>
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
          </Router>
          </StoresProvider>
        </ThemeProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App; 