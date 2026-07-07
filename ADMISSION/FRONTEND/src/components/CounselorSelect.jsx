import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';

/**
 * Searchable dropdown for selecting a counselor
 * @param {Array} counselors - List of counselors { id, name }
 * @param {Function} onChange - Callback function returning selected counselor_id
 * @param {Number|String} selectedId - currently selected counselor_id
 */
const CounselorSelect = ({ counselors = [], onChange, selectedId = null }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCounselors = counselors.filter((counselor) =>
    counselor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedCounselor = counselors.find((c) => c.id === selectedId);

  const handleSelect = (id) => {
    onChange(id);
    setIsOpen(false);
    setSearchTerm('');
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      {/* Dropdown Toggle */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 text-left bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
      >
        <span className="block truncate text-gray-700">
          {selectedCounselor ? selectedCounselor.name : 'Select a Counselor...'}
        </span>
        <ChevronDown
          className={`w-5 h-5 ml-2 -mr-1 text-gray-400 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg top-full ring-1 ring-black ring-opacity-5">
          <div className="p-2">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full py-2 pl-10 pr-3 text-sm border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="Search counselors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          
          <ul className="max-h-60 mt-1 pb-1 overflow-auto text-base rounded-b-md focus:outline-none sm:text-sm">
            {filteredCounselors.length > 0 ? (
              filteredCounselors.map((counselor) => (
                <li
                  key={counselor.id}
                  className={`relative py-2 pl-3 select-none pr-9 cursor-pointer hover:bg-blue-50 transition-colors ${
                    selectedId === counselor.id ? 'bg-blue-100 text-blue-900' : 'text-gray-900'
                  }`}
                  onClick={() => handleSelect(counselor.id)}
                >
                  <div className="flex items-center">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 uppercase text-blue-600 flex items-center justify-center font-semibold text-xs border border-blue-200">
                       {counselor.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <span className="block ml-3 font-medium truncate">
                      {counselor.name}
                    </span>
                  </div>
                  {selectedId === counselor.id && (
                    <span className="absolute inset-y-0 right-0 flex items-center pr-4 text-blue-600">
                      <Check className="w-5 h-5" aria-hidden="true" />
                    </span>
                  )}
                </li>
              ))
            ) : (
              <li className="py-2 pl-3 pr-9 text-gray-500 cursor-default select-none">
                No counselors found
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

export default CounselorSelect;
