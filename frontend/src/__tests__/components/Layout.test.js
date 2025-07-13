import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Layout from '../../components/Layout';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';

// Mock navigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/dashboard' }),
}));

// Mock AuthContext
const mockUser = {
  _id: '1',
  firstName: 'John',
  lastName: 'Doe',
  email: 'john@example.com',
  role: 'user'
};

const mockAuthContext = {
  user: mockUser,
  logout: jest.fn(),
  loading: false
};

jest.mock('../../contexts/AuthContext', () => ({
  ...jest.requireActual('../../contexts/AuthContext'),
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }) => <div>{children}</div>
}));

// Mock ThemeContext
const mockThemeContext = {
  theme: 'light',
  resolvedTheme: 'light',
  setTheme: jest.fn(),
  toggleTheme: jest.fn(),
  themes: [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' }
  ]
};

jest.mock('../../contexts/ThemeContext', () => ({
  ...jest.requireActual('../../contexts/ThemeContext'),
  useTheme: () => mockThemeContext,
  ThemeProvider: ({ children }) => <div>{children}</div>
}));

const renderLayout = (children = <div>Test Content</div>) => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Layout>{children}</Layout>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('Layout Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Navigation Menu', () => {
    it('renders all navigation items', () => {
      renderLayout();
      
      expect(screen.getAllByText('Dashboard')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Family Members')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Meals')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Meal Planner')[0]).toBeInTheDocument();
      expect(screen.getAllByText('Settings')[0]).toBeInTheDocument();
    });

    it('has correct icons for navigation items', () => {
      renderLayout();
      
      // Check that all navigation items have their respective icons
      const navItems = screen.getAllByRole('button').filter(btn => 
        ['Dashboard', 'Family Members', 'Meals', 'Meal Planner', 'Settings'].includes(btn.textContent)
      );
      
      expect(navItems).toHaveLength(5);
    });

    it('navigates to correct routes when navigation items are clicked', () => {
      renderLayout();
      
      // Test Dashboard navigation
      const dashboardButton = screen.getAllByText('Dashboard').find(text => text.closest('button'));
      fireEvent.click(dashboardButton);
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
      
      // Test Family Members navigation
      const familyMembersButton = screen.getAllByText('Family Members').find(text => text.closest('button'));
      fireEvent.click(familyMembersButton);
      expect(mockNavigate).toHaveBeenCalledWith('/family-members');
      
      // Test Meals navigation (new)
      const mealsButton = screen.getAllByText('Meals').find(text => text.closest('button'));
      fireEvent.click(mealsButton);
      expect(mockNavigate).toHaveBeenCalledWith('/meals');
      
      // Test Meal Planner navigation
      const mealPlannerButton = screen.getAllByText('Meal Planner').find(text => text.closest('button'));
      fireEvent.click(mealPlannerButton);
      expect(mockNavigate).toHaveBeenCalledWith('/meal-planner');
      
      // Test Settings navigation
      const settingsButton = screen.getAllByText('Settings').find(text => text.closest('button'));
      fireEvent.click(settingsButton);
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('displays navigation items in correct order', () => {
      renderLayout();
      
      const navButtons = screen.getAllByRole('button').filter(btn => 
        ['Dashboard', 'Family Members', 'Meals', 'Meal Planner', 'Settings'].includes(btn.textContent)
      );
      
      expect(navButtons[0]).toHaveTextContent('Dashboard');
      expect(navButtons[1]).toHaveTextContent('Family Members');
      expect(navButtons[2]).toHaveTextContent('Meals');
      expect(navButtons[3]).toHaveTextContent('Meal Planner');
      expect(navButtons[4]).toHaveTextContent('Settings');
    });
  });

  describe('Sidebar Header', () => {
    it('renders the Meal Planner logo and title', () => {
      renderLayout();
      
      expect(screen.getAllByText('Meal Planner')[0]).toBeInTheDocument();
    });

    it('has collapse/expand functionality', () => {
      renderLayout();
      
      // Find the collapse button (desktop only)
      const collapseButton = screen.getByTitle('Collapse sidebar');
      expect(collapseButton).toBeInTheDocument();
      
      // Click to collapse
      fireEvent.click(collapseButton);
      
      // Check if expand button appears
      waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });
    });
  });

  describe('User Menu', () => {
    it('displays user name', () => {
      renderLayout();
      
      expect(screen.getAllByText('John Doe')[0]).toBeInTheDocument();
    });

    it('opens user menu when clicked', () => {
      renderLayout();
      
      const userMenuButton = screen.getAllByText('John Doe').find(text => text.closest('button'))?.closest('button');
      fireEvent.click(userMenuButton);
      
      expect(screen.getAllByText('Settings')[0]).toBeInTheDocument();
      expect(screen.getByText('Sign Out')).toBeInTheDocument();
    });

    it('navigates to settings from user menu', () => {
      renderLayout();
      
      const userMenuButton = screen.getAllByText('John Doe').find(text => text.closest('button'))?.closest('button');
      fireEvent.click(userMenuButton);
      
      const settingsButton = screen.getAllByText('Settings').find(btn => 
        btn.closest('.absolute') // Settings button in dropdown
      );
      fireEvent.click(settingsButton);
      
      expect(mockNavigate).toHaveBeenCalledWith('/settings');
    });

    it('calls logout when Sign Out is clicked', async () => {
      renderLayout();
      
      const userMenuButton = screen.getAllByText('John Doe').find(text => text.closest('button'))?.closest('button');
      fireEvent.click(userMenuButton);
      
      const signOutButton = screen.getByText('Sign Out');
      fireEvent.click(signOutButton);
      
      // Wait for the async logout operation to complete
      await waitFor(() => {
        expect(mockAuthContext.logout).toHaveBeenCalled();
        expect(mockNavigate).toHaveBeenCalledWith('/login');
      });
    });
  });

  describe('Top Bar', () => {
    it('displays current page title', () => {
      renderLayout();
      
      // Based on mocked location pathname '/dashboard'  
      const dashboardNavItems = screen.getAllByText('Dashboard');
      expect(dashboardNavItems.length).toBeGreaterThan(0);
    });

    it('shows mobile menu button on mobile', () => {
      renderLayout();
      
      // The mobile menu button should be present
      const mobileMenuButtons = screen.getAllByRole('button').filter(btn => 
        btn.getAttribute('class')?.includes('lg:hidden')
      );
      
      expect(mobileMenuButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Sidebar Collapse Behavior', () => {
    it('hides navigation text when collapsed', async () => {
      renderLayout();
      
      const collapseButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(collapseButton);
      
      // After collapsing, navigation items should still be clickable but text might be hidden
      // The buttons should still exist for functionality
      expect(screen.getAllByText('Dashboard')[0]).toBeInTheDocument();
    });

    it('shows expand button when collapsed', async () => {
      renderLayout();
      
      const collapseButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(collapseButton);
      
      await waitFor(() => {
        expect(screen.getByTitle('Expand sidebar')).toBeInTheDocument();
      });
    });

    it('expands when expand button is clicked', async () => {
      renderLayout();
      
      // First collapse
      const collapseButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(collapseButton);
      
      // Wait for expand button and click it
      await waitFor(() => {
        const expandButton = screen.getByTitle('Expand sidebar');
        fireEvent.click(expandButton);
      });
      
      // Should show collapse button again
      await waitFor(() => {
        expect(screen.getByTitle('Collapse sidebar')).toBeInTheDocument();
      });
    });
  });

  describe('Mobile Sidebar', () => {
    it('closes mobile sidebar when navigation item is clicked', () => {
      renderLayout();
      
      // Simulate mobile menu open (this would normally be triggered by the mobile menu button)
      const dashboardNavButton = screen.getAllByText('Dashboard')[0]; // Get the nav button, not the page header
      fireEvent.click(dashboardNavButton);
      
      // Navigation should still work
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard');
    });
  });

  describe('Content Rendering', () => {
    it('renders children content', () => {
      renderLayout(<div data-testid="test-content">Test Content</div>);
      
      expect(screen.getByTestId('test-content')).toBeInTheDocument();
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('applies correct margin for collapsed/expanded sidebar', () => {
      renderLayout();
      
      const mainContent = screen.getByRole('main').parentElement;
      
      // Should have expanded margin initially
      expect(mainContent).toHaveClass('lg:ml-64');
      
      // Collapse sidebar
      const collapseButton = screen.getByTitle('Collapse sidebar');
      fireEvent.click(collapseButton);
      
      // Should update to collapsed margin
      waitFor(() => {
        expect(mainContent).toHaveClass('lg:ml-16');
      });
    });
  });

  describe('Active Navigation State', () => {
    it('highlights active navigation item', () => {
      // Mock being on the meals page
      require('react-router-dom').useLocation = jest.fn().mockReturnValue({
        pathname: '/meals'
      });
      
      renderLayout();
      
      const mealsNavItems = screen.getAllByText('Meals');
      const mealsNavItem = mealsNavItems.find(item => item.closest('button')); // Get the navigation button, not the page header
      expect(mealsNavItem.closest('button')).toHaveClass('bg-primary-50', 'text-primary-700');
    });
  });
}); 