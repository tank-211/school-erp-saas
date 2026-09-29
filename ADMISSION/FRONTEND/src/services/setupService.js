/**
 * services/setupService.js
 * School setup API: academic years, classes and sections (/api/setup).
 * Reads are open to any school user; changes need a school admin.
 */
import axios from 'axios';
import { getAuthHeader } from '../utils/authToken.js';

const API_BASE_URL = '/api/setup';

const call = async (method, path, data) => {
  try {
    const response = await axios({
      method,
      url: `${API_BASE_URL}${path}`,
      data,
      headers: getAuthHeader(),
    });
    if (response.data && response.data.success) {
      return response.data;
    }
    throw new Error(response.data?.message || 'Request failed');
  } catch (error) {
    // Surface the server's message (for example "Class is in use") to the page
    throw new Error(error.response?.data?.message || error.message || 'Request failed');
  }
};

export const fetchSetupOverview = async () => (await call('get', '/overview')).data;

export const createAcademicYear = (data) => call('post', '/academic-years', data);
export const updateAcademicYear = (id, data) => call('patch', `/academic-years/${id}`, data);
export const activateAcademicYear = (id) => call('post', `/academic-years/${id}/activate`);
export const deleteAcademicYear = (id) => call('delete', `/academic-years/${id}`);

export const createClass = (data) => call('post', '/classes', data);
export const createClassesBulk = (data) => call('post', '/classes/bulk', data);
export const updateClass = (id, data) => call('patch', `/classes/${id}`, data);
export const deleteClass = (id) => call('delete', `/classes/${id}`);

export const createSection = (classId, data) => call('post', `/classes/${classId}/sections`, data);
export const updateSection = (id, data) => call('patch', `/sections/${id}`, data);
export const deleteSection = (id) => call('delete', `/sections/${id}`);
