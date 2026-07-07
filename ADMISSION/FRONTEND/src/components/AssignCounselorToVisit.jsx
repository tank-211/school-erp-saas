import React, { useState, useEffect } from 'react';
import CounselorSelect from './CounselorSelect.jsx';
import { fetchSchoolCounselors } from '../services/schoolService.js';

const AssignCounselorToVisit = ({ schoolId }) => {
  const [counselors, setCounselors] = useState([]);
  const [selectedCounselorId, setSelectedCounselorId] = useState(null);
  const [loading, setLoading] = useState(true);

  // Example of using the service in a useEffect hook to populate local state
  useEffect(() => {
    const loadCounselors = async () => {
      setLoading(true);
      try {
        const data = await fetchSchoolCounselors(schoolId);
        setCounselors(data);
      } catch (error) {
        console.error("Failed to load counselors:", error);
      } finally {
        setLoading(false);
      }
    };

    if (schoolId) {
      loadCounselors();
    }
  }, [schoolId]);

  return (
    <div className="max-w-md p-6 mx-auto bg-white rounded-xl shadow-md space-y-4">
      <h2 className="text-xl font-semibold text-gray-800">Assign Counselor</h2>
      <p className="text-sm text-gray-500 mb-2">Select a counselor for the campus visit</p>
      
      {loading ? (
        <div className="flex items-center justify-center p-4 border border-gray-200 rounded-lg bg-gray-50">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600 text-sm">Loading counselors...</span>
        </div>
      ) : (
        <CounselorSelect 
          counselors={counselors} 
          selectedId={selectedCounselorId} 
          onChange={(id) => setSelectedCounselorId(id)} 
        />
      )}

      {selectedCounselorId && (
        <div className="pt-2">
           <button 
             className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors focus:ring-4 focus:ring-blue-300"
             onClick={() => console.log('Assigning counselor ID:', selectedCounselorId)}
           >
             Confirm Assignment
           </button>
        </div>
      )}
    </div>
  );
};

export default AssignCounselorToVisit;
