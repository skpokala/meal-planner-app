import axios from 'axios';

// Runtime API URL configuration
const getApiUrl = () => {
  // First check if there's a runtime configuration
  if (window.API_URL) {
    console.log('Using runtime API URL:', window.API_URL);
    return window.API_URL;
  }
  
  // Then check build-time environment variable
  if (process.env.REACT_APP_API_URL) {
    console.log('Using build-time API URL:', process.env.REACT_APP_API_URL);
    return process.env.REACT_APP_API_URL;
  }
  
  // For production domains with HTTPS, check if we have an external reverse proxy
  if (window.location.hostname !== 'localhost') {
    const currentUrl = `${window.location.protocol}//${window.location.hostname}`;
    
    // For HTTPS domains, first try relative URLs (if external proxy is configured)
    if (window.location.protocol === 'https:') {
      console.log('HTTPS domain detected. Current location:', currentUrl);
      console.log('Attempting to use relative URLs (/api) - ensure your reverse proxy forwards /api requests to backend');
      console.log('If this fails, set window.API_URL in browser console or configure external reverse proxy');
      return '/api';
    }
    
    // For HTTP domains or containerized deployments, use relative URLs
    console.log('HTTP domain detected, using relative URLs for nginx proxy');
    return '/api';
  }
  
  // Default fallback for local development
  console.log('Local development detected, using localhost:5001');
  return 'http://localhost:5001/api';
};

// Create axios instance with base configuration
const api = axios.create({
  baseURL: getApiUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
  withCredentials: false,
});

// Request interceptor to add auth token and cache busting
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Add cache busting for GET requests
    if (config.method === 'get') {
      config.params = {
        ...config.params,
        _t: Date.now() // Cache busting timestamp
      };
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - let AuthContext handle the redirect
      localStorage.removeItem('token');
      // Don't redirect here - let the AuthContext handle it
    }
    return Promise.reject(error);
  }
);

export default api; 