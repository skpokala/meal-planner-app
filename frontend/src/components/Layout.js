import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import {
  Home,
  Users,
  Calendar,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(true);

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: Home },
    { name: 'Family Members', href: '/family-members', icon: Users },
    { name: 'Meal Planner', href: '/meal-planner', icon: Calendar },
    { name: 'Settings', href: '/settings', icon: Settings },
  ];

  // Auto-hide expand button after 3 seconds when sidebar is collapsed
  useEffect(() => {
    let timer;
    if (sidebarCollapsed) {
      setShowExpandButton(true); // Show initially
      timer = setTimeout(() => {
        setShowExpandButton(false);
      }, 3000);
    } else {
      setShowExpandButton(true); // Always show when expanded
    }
    
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [sidebarCollapsed]);

  const handleMouseLeave = () => {
    if (sidebarCollapsed) {
      setTimeout(() => setShowExpandButton(false), 500);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-secondary-50">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-white shadow-card-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center h-16 px-4 border-b border-secondary-200 flex-shrink-0 ${
            sidebarCollapsed ? 'justify-center' : 'justify-between'
          }`}>
            {sidebarCollapsed ? (
              // Collapsed header - show expand button with logo as background
              <div 
                className="relative flex items-center justify-center w-full"
                onMouseEnter={() => setShowExpandButton(true)}
                onMouseLeave={handleMouseLeave}
              >
                <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={`absolute -right-2 top-1/2 transform -translate-y-1/2 w-6 h-6 bg-white border border-secondary-200 rounded-full flex items-center justify-center text-secondary-500 hover:text-secondary-700 hover:bg-secondary-50 transition-all duration-300 shadow-sm ${
                    showExpandButton ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-2 pointer-events-none'
                  }`}
                  title="Expand sidebar"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              // Expanded header - normal layout
              <>
                <div className="flex items-center min-w-0">
                  <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-white" />
                  </div>
                  <span className="ml-3 text-lg font-semibold text-secondary-900 truncate">
                    Meal Planner
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className="hidden lg:block text-secondary-500 hover:text-secondary-700 flex-shrink-0"
                    title="Collapse sidebar"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setSidebarOpen(false)}
                    className="lg:hidden text-secondary-500 hover:text-secondary-700 flex-shrink-0"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4">
            <div className="px-2 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = isActivePath(item.href);
                return (
                  <button
                    key={item.name}
                    onClick={() => {
                      navigate(item.href);
                      setSidebarOpen(false);
                    }}
                    className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-card transition-colors ${
                      isActive
                        ? 'bg-primary-50 text-primary-700'
                        : 'text-secondary-700 hover:bg-secondary-50 hover:text-secondary-900'
                    } ${
                      sidebarCollapsed ? 'justify-center' : ''
                    }`}
                    title={sidebarCollapsed ? item.name : ''}
                  >
                    <Icon className={`w-5 h-5 flex-shrink-0 ${sidebarCollapsed ? '' : 'mr-3'}`} />
                    {!sidebarCollapsed && <span className="truncate">{item.name}</span>}
                  </button>
                );
              })}
            </div>
          </nav>

          {/* User info at bottom */}
          <div className="border-t border-secondary-200 p-4 flex-shrink-0">
            <div className={`flex items-center text-sm text-secondary-600 min-w-0 ${sidebarCollapsed ? 'justify-center' : ''}`}>
              <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-primary-600" />
              </div>
              {!sidebarCollapsed && (
                <div className="ml-3 min-w-0 flex-1">
                  <p className="font-medium text-secondary-900 truncate">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-secondary-500 truncate capitalize">{user?.role}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Top bar */}
        <div className="bg-white border-b border-secondary-200 sticky top-0 z-30">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center min-w-0 flex-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-secondary-500 hover:text-secondary-700 mr-3"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h1 className="text-xl font-semibold text-secondary-900 truncate">
                {navigation.find(item => isActivePath(item.href))?.name || 'Dashboard'}
              </h1>
            </div>

            {/* User menu */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center p-2 text-sm text-secondary-700 hover:text-secondary-900 hover:bg-secondary-50 rounded-card transition-colors"
              >
                <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-primary-600" />
                </div>
                <span className="ml-2 hidden sm:block font-medium">
                  {user?.firstName} {user?.lastName}
                </span>
                <ChevronDown className="w-4 h-4 ml-1 text-secondary-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-card shadow-card-lg border border-secondary-200 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-secondary-700 hover:bg-secondary-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4 mr-3" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6" style={{ marginTop: 0, paddingTop: 0 }}>
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout; 