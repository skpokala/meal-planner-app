import React, { useState, useEffect, useRef } from 'react';
import { MapPin, Search, X } from 'lucide-react';

const AddressAutocomplete = ({ 
  value, 
  onChange, 
  onAddressSelect, 
  placeholder = "Enter address...",
  className = "",
  required = false 
}) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const timeoutRef = useRef(null);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchAddresses = async (query) => {
    if (!query || query.length < 3) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Use backend proxy to Google Geocoding API
      const response = await fetch(`/api/location/search?q=${encodeURIComponent(query)}`);
      
      if (!response.ok) throw new Error('Failed to fetch suggestions');
      
      const data = await response.json();
      const formatted = Array.isArray(data.suggestions) ? data.suggestions : [];
      setSuggestions(formatted);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Error fetching address suggestions:', error);
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const extractStreetAddress = (address) => {
    const parts = [];
    if (address.house_number) parts.push(address.house_number);
    if (address.road) parts.push(address.road);
    return parts.join(' ') || address.display_name?.split(',')[0] || '';
  };



  const handleInputChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange(newValue);

    // Clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set new timeout for debounced search
    timeoutRef.current = setTimeout(() => {
      searchAddresses(newValue);
    }, 300);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion.displayName);
    onChange(suggestion.displayName);
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Notify parent component with structured address data
    if (onAddressSelect) {
      onAddressSelect(suggestion);
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange('');
    setSuggestions([]);
    setShowSuggestions(false);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder}
          required={required}
          className={`input pl-10 pr-10 w-full ${loading ? 'cursor-wait' : ''}`}
        />
        {inputValue && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded hover:bg-gray-100 transition-colors"
            title="Clear address"
          >
            <X className="w-4 h-4" />
          </button>
        )}
                 {loading && (
           <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
             <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" data-testid="loading-spinner"></div>
           </div>
         )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion.id}
              type="button"
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-gray-50 focus:bg-gray-50 focus:outline-none border-b border-gray-100 last:border-b-0 transition-colors"
            >
              <div className="flex items-start space-x-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {suggestion.address.street}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {suggestion.address.city}, {suggestion.address.state} {suggestion.address.zipCode}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {showSuggestions && inputValue.length >= 3 && suggestions.length === 0 && !loading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg p-4 text-center text-gray-500 text-sm">
          <MapPin className="w-6 h-6 text-gray-300 mx-auto mb-2" />
          No addresses found. Try a different search term.
        </div>
      )}
    </div>
  );
};

export default AddressAutocomplete; 