import axios from 'axios';
import { getAuthHeader } from '../utils/authToken.js';

const API_BASE_URL = '/api/schools';

/**
 * Fetch all active counselors for a specific school
 * @param {Number|String} schoolId - The ID of the school
 * @returns {Promise<Array>} Array of counselor objects { id, name }
 */
export const fetchSchoolCounselors = async (schoolId) => {
  try {
    const headers = getAuthHeader(); // Assumes token is added correctly here, returning an object like { Authorization: 'Bearer ...' }
    
    const response = await axios.get(`${API_BASE_URL}/${schoolId}/counselors`, {
      headers,
    });
    
    if (response.data && response.data.success) {
      return response.data.data; // The array of counselors
    } else {
      throw new Error(response.data?.message || 'Failed to fetch counselors');
    }
  } catch (error) {
    console.error('Error in fetchSchoolCounselors:', error);
    // Basic error handling per instructions
    return [];
  }
};
