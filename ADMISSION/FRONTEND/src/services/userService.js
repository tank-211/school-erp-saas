import axios from 'axios';
import { getAuthHeader } from '../utils/authToken.js';

const API_BASE_URL = '/api/users';

export const fetchUsers = async () => {
  try {
    const response = await axios.get(API_BASE_URL, {
      headers: getAuthHeader(),
    });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to fetch users');
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
};

export const createUser = async (userData) => {
  try {
    const response = await axios.post(API_BASE_URL, userData, {
      headers: getAuthHeader(),
    });
    if (response.data && response.data.success) {
      return response.data;
    }
    throw new Error(response.data?.message || 'Failed to create user');
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

export const resetUserPassword = async (userId, newPassword) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/${userId}/reset-password`, { newPassword }, {
      headers: getAuthHeader(),
    });
    if (response.data && response.data.success) {
      return response.data;
    }
    throw new Error(response.data?.message || 'Failed to reset password');
  } catch (error) {
    console.error('Error resetting password:', error);
    throw error;
  }
};
