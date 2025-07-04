import React from 'react';
import { render, screen } from '@testing-library/react';
import Dashboard from '../../pages/Dashboard';
import { renderWithProviders } from '../utils/testUtils';

// Mock the API module
jest.mock('../../services/api', () => ({
  get: jest.fn(() => Promise.resolve({ 
    data: { 
      familyMembers: [], 
      count: 0,
      stats: { overview: { totalMeals: 0, plannedMeals: 0, cookedMeals: 0 } },
      meals: []
    } 
  })),
  interceptors: {
    request: { use: jest.fn() },
    response: { use: jest.fn() }
  }
}));

describe('Dashboard', () => {
  beforeEach(() => {
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
      },
      writable: true
    });
  });

  it('renders dashboard component', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText('Welcome back!')).toBeInTheDocument();
  });

  it('renders welcome message', () => {
    renderWithProviders(<Dashboard />);
    expect(screen.getByText("Here's an overview of your family's meal planning activities.")).toBeInTheDocument();
  });
}); 