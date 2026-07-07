import axios from 'axios'


// Localhost chya jagi 127.0.0.1 vapra
const API_BASE_URL = 'http://127.0.0.1:5002/api/super-admin'

const superAdminApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

superAdminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('spToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

const getErrorMessage = (error, fallback) => {
  return error?.response?.data?.error || fallback
}

const createServiceError = (error, fallback) => {
  return new Error(getErrorMessage(error, fallback), { cause: error })
}

export const superAdminService = {
  async login(email, password) {
    try {
      const response = await superAdminApi.post('/login', { email, password })
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Login failed.')
    }
  },

  async getSchools() {
    try {
      const response = await superAdminApi.get('/schools')
      return response.data.schools || []
    } catch (error) {
      throw createServiceError(error, 'Failed to load schools.')
    }
  },

  async createSchool(data) {
    try {
      const response = await superAdminApi.post('/schools', data)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to create school.')
    }
  },

  async updateSchool(id, data) {
    try {
      const response = await superAdminApi.patch(`/schools/${id}`, data)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to update school.')
    }
  },

  // App Users (app_user table)
  async getUsers() {
    try {
      const response = await superAdminApi.get('/users')
      return response.data.users || []
    } catch (error) {
      throw createServiceError(error, 'Failed to load users.')
    }
  },

  async createUser(data) {
    try {
      const response = await superAdminApi.post('/users', data)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to create user.')
    }
  },

  async updateUser(id, data) {
    try {
      const response = await superAdminApi.patch(`/users/${id}`, data)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to update user.')
    }
  },

  async deleteUser(id) {
    try {
      const response = await superAdminApi.delete(`/users/${id}`)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to delete user.')
    }
  },

  async resetUserPassword(id, data) {
    try {
      const response = await superAdminApi.post(`/users/${id}/reset-password`, data)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to reset password.')
    }
  },

  async getStats() {
    try {
      const response = await superAdminApi.get('/stats')
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to load dashboard stats.')
    }
  },

  async getStaff() {
    try {
      const response = await superAdminApi.get('/staff')
      return response.data.staff || []
    } catch (error) {
      throw createServiceError(error, 'Failed to load staff.')
    }
  },

  async createStaff(data) {
    try {
      const response = await superAdminApi.post('/staff', data)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to create staff member.')
    }
  },

  async renewSchoolSubscription(id, data) {
    try {
      const response = await superAdminApi.post(`/schools/${id}/renew`, data)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to renew subscription.')
    }
  },

  async getSchoolRenewals(id) {
    try {
      const response = await superAdminApi.get(`/schools/${id}/renewals`)
      return response.data.renewals || []
    } catch (error) {
      throw createServiceError(error, 'Failed to load renewal history.')
    }
  },

}
