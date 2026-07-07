import axios from 'axios';
import { getAuthHeader } from '../utils/authToken.js';

const API_BASE_URL = '/api/admin';

export const fetchAdminUsers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/users`, {
      headers: getAuthHeader(),
    });
    if (response.data && response.data.success) {
      return response.data.data;
    }
    throw new Error(response.data?.message || 'Failed to fetch users');
  } catch (error) {
    console.error('Error fetching admin users:', error);
    throw error;
  }
};

export const createAdminUser = async (userData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/create-user`, userData, {
      headers: getAuthHeader(),
    });
    if (response.data && response.data.success) {
      return response.data;
    }
    throw new Error(response.data?.message || 'Failed to create user');
  } catch (error) {
    console.error('Error creating admin user:', error);
    throw error;
  }
};

export const updateAdminUserPassword = async (userId, newPassword) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/update-password/${userId}`, { newPassword }, {
      headers: getAuthHeader(),
    });
    if (response.data && response.data.success) {
      return response.data;
    }
    throw new Error(response.data?.message || 'Failed to update password');
  } catch (error) {
    console.error('Error updating password:', error);
    throw error;
  }
};

export const deleteAdminUser = async (userId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/delete-user/${userId}`, {
      headers: getAuthHeader(),
    });
    if (response.data && response.data.success) {
      return response.data;
    }
    throw new Error(response.data?.message || 'Failed to delete user');
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};
