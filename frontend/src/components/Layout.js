import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import Version from './Version';
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
  ChefHat,
  Database,
  Shield,
  FileText,
} from 'lucide-react';

const Layout = ({ children }) => {
  const { user, logout, isSystemAdmin, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showExpandButton, setShowExpandButton] = useState(true);

  // Build navigation based on user permissions
  const getNavigation = () => {
    const baseNavigation = [
      { name: 'Dashboard', href: '/dashboard', icon: Home },
      { name: 'Meals', href: '/meals', icon: ChefHat },
      { name: 'Meal Planner', href: '/meal-planner', icon: Calendar },
      { name: 'Master Data', href: '/master-data', icon: Database },
    ];

    // Add admin-only Family Members section
    if (isAdmin()) {
      baseNavigation.splice(1, 0, { name: 'Family Members', href: '/family-members', icon: Users });
    }

    // Add admin-only sections
    if (isAdmin()) {
      baseNavigation.push({ 
        name: 'Audit Logs', 
        href: '/audit', 
        icon: Shield,
        adminOnly: true 
      });
      baseNavigation.push({ 
        name: 'Release Notes', 
        href: '/release-notes', 
        icon: FileText,
        adminOnly: true 
      });
    }

    // Always add settings at the end
    baseNavigation.push({ name: 'Settings', href: '/settings', icon: Settings });
    
    return baseNavigation;
  };

  const navigation = getNavigation();

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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isActivePath = (path) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-secondary-50 dark:bg-secondary-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 bg-white dark:bg-secondary-800 shadow-card-lg transform transition-all duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } ${
          sidebarCollapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className={`flex items-center h-16 px-4 border-b border-secondary-200 dark:border-secondary-700 flex-shrink-0 ${
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
                  <span className="ml-3 text-lg font-semibold text-secondary-900 dark:text-secondary-100 truncate">
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
                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                        : 'text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 hover:text-secondary-900 dark:hover:text-secondary-100'
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

          {/* Version info at bottom */}
          <div className="border-t border-secondary-200 dark:border-secondary-700 p-4 flex-shrink-0">
            <Version sidebarCollapsed={sidebarCollapsed} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex flex-col min-h-screen transition-all duration-300 ${sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'}`}>
        {/* Top bar */}
        <div className="bg-white dark:bg-secondary-800 border-b border-secondary-200 dark:border-secondary-700 sticky top-0 z-30">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6">
            <div className="flex items-center min-w-0 flex-1">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-secondary-500 dark:text-secondary-400 hover:text-secondary-700 dark:hover:text-secondary-300 mr-3"
              >
                <Menu className="w-6 h-6" />
              </button>
              
              {/* Section Icon and Title */}
              <div className="flex items-center min-w-0">
                {(() => {
                  const currentNav = navigation.find(item => isActivePath(item.href)) || navigation[0];
                  const IconComponent = currentNav.icon;
                  return (
                    <>
                      <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <IconComponent className="w-5 h-5 text-primary-600 dark:text-primary-400" />
                      </div>
                      <h1 className="text-xl font-semibold text-secondary-900 dark:text-secondary-100 truncate">
                        {currentNav.name}
                      </h1>
                    </>
                  );
                })()}
              </div>
            </div>

            {/* Theme toggle and User menu */}
            <div className="flex items-center space-x-2">
              <ThemeToggle variant="simple" />
              
              <div className="relative flex-shrink-0">
                                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center p-2 text-sm text-secondary-700 dark:text-secondary-300 hover:text-secondary-900 dark:hover:text-secondary-100 hover:bg-secondary-50 dark:hover:bg-secondary-700 rounded-card transition-colors"
                >
                  <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900/20 rounded-full flex items-center justify-center">
                    <User className="w-4 h-4 text-primary-600 dark:text-primary-400" />
                  </div>
                  <span className="ml-2 hidden sm:block font-medium">
                    {user?.firstName} {user?.lastName}
                  </span>
                  <ChevronDown className="w-4 h-4 ml-1 text-secondary-400 dark:text-secondary-500" />
                </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-secondary-800 rounded-card shadow-card-lg border border-secondary-200 dark:border-secondary-700 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setUserMenuOpen(false);
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
                    >
                      <Settings className="w-4 h-4 mr-3" />
                      Settings
                    </button>
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center px-4 py-2 text-sm text-secondary-700 dark:text-secondary-300 hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors"
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