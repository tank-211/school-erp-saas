import axios from 'axios'


// Localhost chya jagi 127.0.0.1 vapra
const API_BASE_URL =
  (import.meta.env.VITE_API_URL || 'http://127.0.0.1:5002') +
  '/api/super-admin';

const superAdminApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
})

// A chosen file as { file_name, file_base64 } (the import endpoints take JSON)
const fileAsJson = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve({ file_name: file.name, file_base64: String(reader.result).replace(/^data:[^,]*,/, '') })
    reader.onerror = () => reject(new Error('The file could not be read.'))
    reader.readAsDataURL(file)
  })

superAdminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('spToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// An expired token (401) or a deactivated operator (403 "Account deactivated.")
// cannot do anything on any page, so drop the stored session and go back to
// the login page, which reads this flag to explain why. A failed login is also
// a 401 but must stay on the form with its own message.
const LOGIN_PATH = '/sp-control-portal'
export const SESSION_ENDED_KEY = 'spSessionEnded'

superAdminApi.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const deactivated =
      status === 403 && error?.response?.data?.error === 'Account deactivated.'
    const isLoginCall = String(error?.config?.url || '').endsWith('/login')

    if ((status === 401 || deactivated) && !isLoginCall) {
      localStorage.removeItem('spToken')
      localStorage.removeItem('spUser')
      try {
        sessionStorage.setItem(SESSION_ENDED_KEY, deactivated ? 'deactivated' : 'expired')
      } catch {
        // storage unavailable: still return to login, just without the notice
      }
      if (window.location.pathname.replace(/\/+$/, '') !== LOGIN_PATH) {
        window.location.assign(LOGIN_PATH)
      }
    }

    return Promise.reject(error)
  },
)

// Most endpoints answer { error }, the payment gateway ones { message }
const getErrorMessage = (error, fallback) => {
  const data = error?.response?.data
  return data?.error || data?.message || fallback
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

  async updateStaff(id, data) {
    try {
      const response = await superAdminApi.patch(`/staff/${id}`, data)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to update staff member.')
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

  // Each school's own Razorpay account
  async getSchoolGateway(id) {
    try {
      const response = await superAdminApi.get(`/schools/${id}/payment-gateway`)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to load the school payment account.')
    }
  },

  async saveSchoolGateway(id, data) {
    try {
      const response = await superAdminApi.put(`/schools/${id}/payment-gateway`, data)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to save the school payment account.')
    }
  },

  async testSchoolGateway(id) {
    try {
      const response = await superAdminApi.post(`/schools/${id}/payment-gateway/test`)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Test failed.')
    }
  },

  // Each school's own email, SMS and WhatsApp accounts (Schools → Communication)
  async getSchoolCommunication(id) {
    try {
      const response = await superAdminApi.get(`/schools/${id}/communication`)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to load the school communication settings.')
    }
  },

  // channel: 'email' | 'sms' | 'whatsapp'
  async saveSchoolCommunication(id, channel, data) {
    try {
      const response = await superAdminApi.put(`/schools/${id}/communication/${channel}`, data)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to save the settings.')
    }
  },

  async testSchoolCommunication(id, channel, to) {
    try {
      const response = await superAdminApi.post(`/schools/${id}/communication/${channel}/test`, { to })
      return response.data
    } catch (error) {
      // A failed test still returns the updated settings (status "failed")
      const e = createServiceError(error, 'Test failed.')
      e.settings = error?.response?.data?.email ? error.response.data : null
      throw e
    }
  },

  async disconnectSchoolCommunication(id, channel) {
    try {
      const response = await superAdminApi.delete(`/schools/${id}/communication/${channel}`)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to disconnect.')
    }
  },

  // Import of a school's existing students (Schools → Import students)
  async downloadStudentImportTemplate(id) {
    try {
      const response = await superAdminApi.get(`/schools/${id}/student-import/template`, { responseType: 'blob' })
      const name = /filename="([^"]+)"/.exec(response.headers?.['content-disposition'] || '')?.[1] || 'existing-students.xlsx'
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = name
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
    } catch (error) {
      let message = 'Could not download the template.'
      try {
        const text = await error?.response?.data?.text?.()
        if (text) message = JSON.parse(text).error || message
      } catch { /* keep the generic message */ }
      throw new Error(message)
    }
  },

  async previewStudentImport(id, file) {
    try {
      const response = await superAdminApi.post(`/schools/${id}/student-import/preview`, await fileAsJson(file))
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Could not check the file.')
    }
  },

  async runStudentImport(id, file) {
    try {
      const response = await superAdminApi.post(`/schools/${id}/student-import`, await fileAsJson(file))
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Could not import the students.')
    }
  },

  async getStudentImports(id) {
    try {
      const response = await superAdminApi.get(`/schools/${id}/student-import/batches`)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Could not load the imports.')
    }
  },

  async undoStudentImport(id, batchId) {
    try {
      const response = await superAdminApi.post(`/schools/${id}/student-import/batches/${batchId}/undo`)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Could not undo the import.')
    }
  },

  async getStudentImportFollowUp(id) {
    try {
      const response = await superAdminApi.get(`/schools/${id}/student-import/follow-up`)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Could not load the follow-up list.')
    }
  },

  async assignImportedStudentClass(id, admissionId, classId, sectionId) {
    try {
      const response = await superAdminApi.patch(`/schools/${id}/student-import/admissions/${admissionId}/class`, { class_id: classId, section_id: sectionId })
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Could not set the class.')
    }
  },

  async markImportedStudentDocument(id, admissionId, documentType) {
    try {
      const response = await superAdminApi.post(`/schools/${id}/student-import/admissions/${admissionId}/documents`, { document_type: documentType })
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Could not save the document.')
    }
  },

  async disconnectSchoolGateway(id) {
    try {
      const response = await superAdminApi.delete(`/schools/${id}/payment-gateway`)
      return response.data
    } catch (error) {
      throw createServiceError(error, 'Failed to disconnect.')
    }
  },

  async getSchool(id) {
    try {
      const response = await superAdminApi.get(`/schools/${id}`)
      return response.data.school || null
    } catch (error) {
      throw createServiceError(error, 'Failed to load school.')
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

  // Payment Gateway
  async getPaymentGateway() {
    try {
      const response = await superAdminApi.get('/payment-gateway')
      return response.data
    } catch (error) {
      throw createServiceError(
        error,
        'Failed to load payment gateway configuration.'
      )
    }
  },

  async createPaymentGateway(data) {
    try {
      const response = await superAdminApi.post('/payment-gateway', data)
      return response.data
    } catch (error) {
      throw createServiceError(
        error,
        'Failed to configure payment gateway.'
      )
    }
  },

  async updatePaymentGateway(data) {
    try {
      const response = await superAdminApi.patch('/payment-gateway', data)
      return response.data
    } catch (error) {
      throw createServiceError(
        error,
        'Failed to update payment gateway.'
      )
    }
  },

  async testPaymentGateway() {
    try {
      const response = await superAdminApi.post('/payment-gateway/test')
      return response.data
    } catch (error) {
      throw createServiceError(
        error,
        'Failed to test payment gateway.'
      )
    }
  },

}
