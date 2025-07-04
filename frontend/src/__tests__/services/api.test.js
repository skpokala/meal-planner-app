import { mockLocalStorage } from '../utils/testUtils';

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    defaults: {
      headers: {
        common: {}
      }
    },
    get: jest.fn(() => Promise.resolve({ data: {} })),
    post: jest.fn(() => Promise.resolve({ data: {} })),
    put: jest.fn(() => Promise.resolve({ data: {} })),
    delete: jest.fn(() => Promise.resolve({ data: {} })),
    interceptors: {
      request: {
        use: jest.fn()
      },
      response: {
        use: jest.fn()
      }
    }
  }))
}));

describe('API Service', () => {
  let mockLocalStorageImpl;

  beforeEach(() => {
    mockLocalStorageImpl = mockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorageImpl,
      writable: true
    });
  });

  it('should be importable', () => {
    const api = require('../../services/api');
    expect(api).toBeDefined();
  });

  it('should create axios instance', () => {
    const axios = require('axios');
    expect(axios.create).toHaveBeenCalled();
  });
}); 