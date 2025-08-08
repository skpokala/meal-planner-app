// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Configure global timeout for waitFor calls - reduced for faster feedback
import { configure } from '@testing-library/react';
configure({ testIdAttribute: 'data-testid', asyncUtilTimeout: 5000 });

// Set Jest timeout for all tests - reduced for faster feedback
jest.setTimeout(15000);

// Mock react-router-dom
import { BrowserRouter } from 'react-router-dom';
import { render } from '@testing-library/react';

// Mock API service to prevent real API calls
jest.mock('./services/api', () => ({
  get: jest.fn().mockResolvedValue({ data: { version: '1.0.0' } }),
  post: jest.fn().mockResolvedValue({ data: { success: true } }),
  put: jest.fn().mockResolvedValue({ data: { success: true } }),
  delete: jest.fn().mockResolvedValue({ data: { success: true } }),
}));

// Global test utilities
export const renderWithRouter = (component) => {
  return render(component, { wrapper: BrowserRouter });
};

// Mock console methods in tests to reduce noise
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('Warning: ReactDOM.render is deprecated') ||
        args[0]?.includes?.('Warning: `ReactDOMTestUtils.act` is deprecated') ||
        args[0]?.includes?.('ReactDOMTestUtils.act') ||
        args[0]?.includes?.('Warning: An update to') ||
        args[0]?.includes?.('inside a test was not wrapped in act') ||
        args[0]?.includes?.('When testing, code that causes React state updates should be wrapped into act') ||
        args[0]?.includes?.('Error updating meal:') ||
        args[0]?.includes?.('Error creating meal:') ||
        args[0]?.includes?.('Error fetching dashboard data:') ||
        args[0]?.includes?.('Error fetching meals:') ||
        args[0]?.includes?.('Error deleting meal:') ||
        args[0]?.includes?.('Error fetching data:') ||
        args[0]?.includes?.('Failed to fetch backend version:') ||
        args[0]?.includes?.('Cross origin') ||
        args[0]?.includes?.('Network Error')) {
      return;
    }
    originalError.call(console, ...args);
  };
  
  console.warn = (...args) => {
    if (args[0]?.includes?.('Warning:') ||
        args[0]?.includes?.('ReactDOMTestUtils.act') ||
        args[0]?.includes?.('deprecated') ||
        args[0]?.includes?.('inside a test was not wrapped in act')) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
}); 