import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import api from '../services/api';

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
  // Visual style preset for the design system: classic (existing) or modern (colorful)
  const [themeStyle, setThemeStyle] = useState(() => {
    try {
      return localStorage.getItem('themeStyle') || 'classic';
    } catch {
      return 'classic';
    }
  });
  const { user } = useAuth?.() || {}; // ThemeProvider is above AuthProvider today; fallback if not available

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

  // Load theme from user profile (if logged in) or localStorage on mount and when user changes
  useEffect(() => {
    if (typeof window === 'undefined' || !window.localStorage) {
      return;
    }
    
    if (user && (user.theme || user.themeStyle)) {
      if (user.theme && ['light', 'dark', 'system'].includes(user.theme)) {
        setTheme(user.theme);
      }
      if (user.themeStyle && ['classic', 'modern', 'nord', 'sunset', 'forest', 'glass'].includes(user.themeStyle)) {
        setThemeStyle(user.themeStyle);
      }
    } else {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme && ['light', 'dark', 'system'].includes(savedTheme)) {
        setTheme(savedTheme);
      }

      const savedThemeStyle = localStorage.getItem('themeStyle');
      if (savedThemeStyle && ['classic', 'modern', 'nord', 'sunset', 'forest', 'glass'].includes(savedThemeStyle)) {
        setThemeStyle(savedThemeStyle);
      }
    }
  }, [user]);

  // Update resolved theme when theme or system theme changes
  useEffect(() => {
    const newResolvedTheme = theme === 'system' ? systemTheme : theme;
    setResolvedTheme(newResolvedTheme);

    // Apply theme to document
    if (typeof window !== 'undefined' && document) {
      const root = document.documentElement;
      
      // Remove existing theme classes
      root.classList.remove('light', 'dark');
      // Remove existing style classes
      root.classList.remove('classic', 'modern', 'nord', 'sunset', 'forest', 'glass');

      // Add new theme class and style class
      root.classList.add(newResolvedTheme);
      root.classList.add(themeStyle);
    }

    // Save theme preference to localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('theme', theme);
    }
  }, [theme, systemTheme, themeStyle]);

  const setThemePreference = async (newTheme) => {
    if (['light', 'dark', 'system'].includes(newTheme)) {
      setTheme(newTheme);
      try {
        // Persist to backend if authenticated
        if (user) {
          await api.put('/auth/profile', { theme: newTheme });
        }
      } catch (err) {
        console.error('Failed to save theme preference:', err);
      }
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

  const setThemeStylePreference = async (newStyle) => {
    if (['classic', 'modern', 'nord', 'sunset', 'forest', 'glass'].includes(newStyle)) {
      setThemeStyle(newStyle);
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('themeStyle', newStyle);
      }
      try {
        if (user) {
          await api.put('/auth/profile', { themeStyle: newStyle });
        }
      } catch (err) {
        console.error('Failed to save theme style:', err);
      }
    }
  };

  const toggleThemeStyle = () => {
    setThemeStylePreference(themeStyle === 'classic' ? 'modern' : 'classic');
  };

  const value = {
    theme, // Current theme setting (light, dark, system)
    resolvedTheme, // Actual theme being used (light or dark)
    systemTheme, // System preference (light or dark)
    setTheme: setThemePreference,
    toggleTheme,
    themeStyle, // Current design style (classic or modern)
    setThemeStyle: setThemeStylePreference,
    toggleThemeStyle,
    themes: [
      { value: 'light', label: 'Light', icon: 'sun' },
      { value: 'dark', label: 'Dark', icon: 'moon' },
      { value: 'system', label: 'System', icon: 'monitor' }
    ],
    styles: [
      { value: 'classic', label: 'Classic', description: 'Traditional clean interface' },
      { value: 'modern', label: 'Modern', description: 'Vibrant and colorful' },
      { value: 'nord', label: 'Nord', description: 'Cool arctic colors' },
      { value: 'sunset', label: 'Sunset', description: 'Warm gradient tones' },
      { value: 'forest', label: 'Forest', description: 'Natural earth tones' },
      { value: 'glass', label: 'Glass', description: 'iOS 26/Tahoe 26 futuristic glassmorphism' }
    ]
  };

  console.log('ThemeContext - providing value:', { themeStyle, toggleThemeStyle: typeof toggleThemeStyle });

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}; 