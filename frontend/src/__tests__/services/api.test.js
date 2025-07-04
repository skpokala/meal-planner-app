import axios from 'axios';
import api from '../../services/api';
import { mockLocalStorage } from '../utils/testUtils';

// Mock axios
jest.mock('axios');
const mockedAxios = axios;

describe('API Service', () => {
  let mockLocalStorageImpl;

  beforeEach(() => {
    mockLocalStorageImpl = mockLocalStorage();
    Object.defineProperty(window, 'localStorage', {
      value: mockLocalStorageImpl,
      writable: true
    });
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('axios instance configuration', () => {
    it('has correct base configuration', () => {
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: '/api',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    });
  });

  describe('request interceptor', () => {
    it('adds authorization header when token exists', () => {
      const token = 'test-token';
      mockLocalStorageImpl.getItem.mockReturnValue(token);

      // Mock the request interceptor
      const mockRequest = { headers: {} };
      
      // Get the interceptor function (it's the first argument of the first call)
      const interceptorCall = mockedAxios.create().interceptors.request.use.mock.calls[0];
      const requestInterceptor = interceptorCall[0];
      
      const modifiedRequest = requestInterceptor(mockRequest);

      expect(modifiedRequest.headers.Authorization).toBe(`Bearer ${token}`);
    });

    it('does not add authorization header when token does not exist', () => {
      mockLocalStorageImpl.getItem.mockReturnValue(null);

      const mockRequest = { headers: {} };
      
      const interceptorCall = mockedAxios.create().interceptors.request.use.mock.calls[0];
      const requestInterceptor = interceptorCall[0];
      
      const modifiedRequest = requestInterceptor(mockRequest);

      expect(modifiedRequest.headers.Authorization).toBeUndefined();
    });

    it('handles request interceptor errors', () => {
      const interceptorCall = mockedAxios.create().interceptors.request.use.mock.calls[0];
      const errorHandler = interceptorCall[1];
      
      const error = new Error('Request error');
      
      expect(() => errorHandler(error)).rejects.toThrow('Request error');
    });
  });

  describe('response interceptor', () => {
    it('returns response data on success', () => {
      const mockResponse = { data: { success: true } };
      
      const interceptorCall = mockedAxios.create().interceptors.response.use.mock.calls[0];
      const responseInterceptor = interceptorCall[0];
      
      const result = responseInterceptor(mockResponse);

      expect(result).toBe(mockResponse);
    });

    it('handles 401 unauthorized errors by clearing storage and reloading', () => {
      // Mock window.location.reload
      delete window.location;
      window.location = { reload: jest.fn() };

      const mockError = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' }
        }
      };
      
      const interceptorCall = mockedAxios.create().interceptors.response.use.mock.calls[0];
      const errorHandler = interceptorCall[1];
      
      expect(() => errorHandler(mockError)).rejects.toEqual(mockError);
      
      expect(mockLocalStorageImpl.removeItem).toHaveBeenCalledWith('token');
      expect(mockLocalStorageImpl.removeItem).toHaveBeenCalledWith('user');
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('handles other errors without clearing storage', () => {
      const mockError = {
        response: {
          status: 500,
          data: { message: 'Server error' }
        }
      };
      
      const interceptorCall = mockedAxios.create().interceptors.response.use.mock.calls[0];
      const errorHandler = interceptorCall[1];
      
      expect(() => errorHandler(mockError)).rejects.toEqual(mockError);
      
      expect(mockLocalStorageImpl.removeItem).not.toHaveBeenCalled();
    });

    it('handles errors without response object', () => {
      const mockError = new Error('Network error');
      
      const interceptorCall = mockedAxios.create().interceptors.response.use.mock.calls[0];
      const errorHandler = interceptorCall[1];
      
      expect(() => errorHandler(mockError)).rejects.toEqual(mockError);
      
      expect(mockLocalStorageImpl.removeItem).not.toHaveBeenCalled();
    });
  });

  describe('error response handling', () => {
    beforeEach(() => {
      // Mock window.location.reload
      delete window.location;
      window.location = { reload: jest.fn() };
    });

    it('clears authentication data on 401 response', () => {
      const error = {
        response: { status: 401 }
      };

      const interceptorCall = mockedAxios.create().interceptors.response.use.mock.calls[0];
      const errorHandler = interceptorCall[1];

      expect(() => errorHandler(error)).rejects.toEqual(error);
      expect(mockLocalStorageImpl.removeItem).toHaveBeenCalledWith('token');
      expect(mockLocalStorageImpl.removeItem).toHaveBeenCalledWith('user');
      expect(window.location.reload).toHaveBeenCalled();
    });

    it('does not clear authentication data on non-401 responses', () => {
      const error = {
        response: { status: 404 }
      };

      const interceptorCall = mockedAxios.create().interceptors.response.use.mock.calls[0];
      const errorHandler = interceptorCall[1];

      expect(() => errorHandler(error)).rejects.toEqual(error);
      expect(mockLocalStorageImpl.removeItem).not.toHaveBeenCalled();
      expect(window.location.reload).not.toHaveBeenCalled();
    });
  });
}); 