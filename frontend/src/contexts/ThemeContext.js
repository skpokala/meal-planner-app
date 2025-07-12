import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState('system');
  const [resolvedTheme, setResolvedTheme] = useState('light');
  const [systemTheme, setSystemTheme] = useState('light');

  // Detect system theme preference
  useEffect(() => {
    // Check if matchMedia is available (not available in older browsers or test environments)
    if (typeof window === 'undefined' || !window.matchMedia) {
      return;
    }
    
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemThemeChange = (e) => {
      setSystemTheme(e.matches ? 'dark' : 'light');
    };

    // Set initial system theme
    setSystemTheme(mediaQuery.matches ? 'dark' : 'light');

    // Listen for system theme changes
    mediaQuery.addEventListener('change', handleSystemThemeChange);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemThemeChange);
    };
  }, []);

  // Load saved theme from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
      setTheme(savedTheme);
    }
  }, []);

  // Update resolved theme when theme or system theme changes
  useEffect(() => {
    const newResolvedTheme = theme === 'system' ? systemTheme : theme;
    setResolvedTheme(newResolvedTheme);

    // Apply theme to document
    if (typeof window !== 'undefined' && document) {
      const root = document.documentElement;
      
      // Remove existing theme classes
      root.classList.remove('light', 'dark');
      
      // Add new theme class
      root.classList.add(newResolvedTheme);
    }

    // Save theme preference to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, systemTheme]);

  const setThemePreference = (newTheme) => {
    if (['light', 'dark', 'system'].includes(newTheme)) {
      setTheme(newTheme);
    }
  };

  const toggleTheme = () => {
    if (theme === 'light') {
      setThemePreference('dark');
    } else if (theme === 'dark') {
      setThemePreference('system');
    } else {
      setThemePreference('light');
    }
  };

  const value = {
    theme, // Current theme setting (light, dark, system)
    resolvedTheme, // Actual theme being used (light or dark)
    systemTheme, // System preference (light or dark)
    setTheme: setThemePreference,
    toggleTheme,
    themes: [
      { value: 'light', label: 'Light', icon: 'sun' },
      { value: 'dark', label: 'Dark', icon: 'moon' },
      { value: 'system', label: 'System', icon: 'monitor' }
    ]
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 