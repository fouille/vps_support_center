import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

const SearchableSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Rechercher...", 
  className = "",
  displayKey = "label",
  valueKey = "value",
  searchKeys = ["label"],
  emptyMessage = "Aucun résultat trouvé"
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredOptions, setFilteredOptions] = useState(options);
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  // Filter options based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredOptions(options);
    } else {
      const filtered = options.filter(option => 
        searchKeys.some(key => 
          option[key]?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
      setFilteredOptions(filtered);
    }
  }, [searchTerm, options, searchKeys]);

  // Handle clicks outside component
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handleSelect = (option) => {
    onChange(option[valueKey]);
    setIsOpen(false);
    setSearchTerm('');
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
  };

  const selectedOption = options.find(option => option[valueKey] === value);
  const displayValue = selectedOption ? selectedOption[displayKey] : '';

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Main input/display */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="input cursor-pointer flex items-center justify-between min-h-[42px]"
      >
        <span className={`flex-1 truncate ${!displayValue ? 'text-gray-500 dark:text-gray-400' : ''}`}>
          {displayValue || placeholder}
        </span>
        <div className="flex items-center space-x-1">
          {value && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          )}
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white dark:bg-dark-surface border border-gray-300 dark:border-dark-border rounded-lg shadow-lg max-h-60 overflow-hidden">
          {/* Search input */}
          <div className="p-3 border-b border-gray-200 dark:border-dark-border">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                ref={inputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-dark-surface text-gray-900 dark:text-dark-text text-sm"
              />
            </div>
          </div>

          {/* Options list */}
          <div className="max-h-40 overflow-y-auto">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option, index) => (
                <div
                  key={`${option[valueKey]}-${index}`}
                  onClick={() => handleSelect(option)}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-dark-card transition-colors ${
                    option[valueKey] === value ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400' : 'text-gray-900 dark:text-dark-text'
                  }`}
                >
                  <div className="font-medium">{option[displayKey]}</div>
                  {option.subtitle && (
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {option.subtitle}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="px-3 py-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                {emptyMessage}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;