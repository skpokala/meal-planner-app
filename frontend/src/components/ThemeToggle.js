import React, { useState, useRef, useEffect } from 'react';
import { Sun, Moon, Monitor, ChevronDown } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle = ({ variant = 'dropdown', className = '' }) => {
  const { theme, resolvedTheme, setTheme, toggleTheme, themes, themeStyle, setThemeStyle, styles } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getThemeIcon = (themeValue, size = 'w-4 h-4') => {
    switch (themeValue) {
      case 'light':
        return <Sun className={size} />;
      case 'dark':
        return <Moon className={size} />;
      case 'system':
        return <Monitor className={size} />;
      default:
        return <Sun className={size} />;
    }
  };

  const getCurrentIcon = () => {
    if (theme === 'system') {
      return <Monitor className="w-4 h-4" />;
    }
    return resolvedTheme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />;
  };

  if (variant === 'simple') {
    return (
      <button
        onClick={toggleTheme}
        className={`p-2 rounded-card text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:text-secondary-100 dark:hover:bg-secondary-800 transition-colors ${className}`}
        title={`Current theme: ${theme}${theme === 'system' ? ` (${resolvedTheme})` : ''}`}
      >
        {getCurrentIcon()}
      </button>
    );
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 p-2 rounded-card text-secondary-600 hover:text-secondary-900 hover:bg-secondary-100 dark:text-secondary-400 dark:hover:text-secondary-100 dark:hover:bg-secondary-800 transition-colors"
        title={`Current theme: ${theme}${theme === 'system' ? ` (${resolvedTheme})` : ''}`}
      >
        {getCurrentIcon()}
        {variant === 'dropdown' && <ChevronDown className="w-3 h-3" />}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-secondary-800 rounded-card shadow-card-lg border border-secondary-200 dark:border-secondary-700 z-50">
          <div className="py-2">
            <div className="px-3 py-2 text-xs font-medium text-secondary-500 dark:text-secondary-400 uppercase tracking-wider">
              Appearance
            </div>
            <div className="px-3 py-2 text-xs font-medium text-secondary-500 dark:text-secondary-400">
              Theme
            </div>
            {themes.map((themeOption) => (
              <button
                key={themeOption.value}
                onClick={() => {
                  setTheme(themeOption.value);
                }}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors ${
                  theme === themeOption.value
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-secondary-700 dark:text-secondary-300'
                }`}
              >
                {getThemeIcon(themeOption.value)}
                <span className="flex-1">{themeOption.label}</span>
                {theme === themeOption.value && themeOption.value === 'system' && (
                  <span className="text-xs text-secondary-500 dark:text-secondary-400">
                    ({resolvedTheme})
                  </span>
                )}
              </button>
            ))}

            <div className="px-3 pt-3 pb-2 text-xs font-medium text-secondary-500 dark:text-secondary-400 border-t border-secondary-200 dark:border-secondary-700">
              Style
            </div>
            {styles?.map((style) => (
              <button
                key={style.value}
                onClick={() => setThemeStyle(style.value)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left hover:bg-secondary-50 dark:hover:bg-secondary-700 transition-colors ${
                  themeStyle === style.value
                    ? 'text-primary-600 dark:text-primary-400 bg-primary-50 dark:bg-primary-900/20'
                    : 'text-secondary-700 dark:text-secondary-300'
                }`}
                title={style.value === 'modern' ? 'Colorful, modern UI' : 'Original classic UI'}
              >
                <span className="inline-block w-2 h-2 rounded-full bg-primary-500" />
                <span className="flex-1">{style.label}</span>
                {themeStyle === style.value && (
                  <span className="text-xs text-secondary-500 dark:text-secondary-400">Selected</span>
                )}
              </button>
            ))}

            <div className="px-3 py-2">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full btn btn-secondary"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThemeToggle; 