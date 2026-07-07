import { getAuthHeader } from '../utils/authToken'

// Use relative path for Vite proxy compatibility
const ADMISSIONS_API = '/api/admissions'

/**
 * Get admission statistics (total, submitted, under_review, approved, waitlisted)
 * GET /api/admissions/stats
 */
export async function getAdmissionStats() {
  try {
    const headers = getAuthHeader()
    if (!headers) {
      console.warn('⚠️ getAdmissionStats: No authentication headers - user may not be logged in')
      throw new Error('Not authenticated')
    }

    const url = `${ADMISSIONS_API}/stats`
    console.log(`📡 Fetching admission stats from: ${url}`)

    const response = await fetch(url, {
      method: 'GET',
      headers
    })

    console.log(`📊 Response status: ${response.status} ${response.statusText}`)

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`❌ API Error Response:`, errorText)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const json = await response.json()
    console.log('📦 Full backend response:', json)

    if (!json.success) {
      console.error('❌ Backend returned success: false')
      console.error('   Error message:', json.message)
      console.error('   Full response:', json)
      throw new Error(json.message || 'Failed to fetch admission stats')
    }

    console.log('✅ Admission stats fetched successfully:', json.data)
    return json.data || {
      total: 0,
      submitted: 0,
      under_review: 0,
      approved: 0,
      rejected: 0,
      waitlisted: 0
    }
  } catch (error) {
    console.error('getAdmissionStats error:', error)
    throw new Error(`Failed to fetch admission statistics: ${error.message}`)
  }
}

/**
        console.log(`📊 Response status: ${response.status} ${response.statusText}`);
 * GET /api/admissions?limit={limit}&offset={offset}
 */
export async function getAdmissions({ limit = 10, offset = 0 } = {}) {
  try {
    const headers = getAuthHeader()
    if (!headers) throw new Error('Not authenticated')

    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString()
    })

    const response = await fetch(`${ADMISSIONS_API}?${params.toString()}`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const json = await response.json()
    if (!json.success) {
      throw new Error(json.message || 'Failed to fetch admissions')
    }

    return json.data || { applications: [], pagination: { total: 0, limit, offset } }
  } catch (error) {
    console.error('getAdmissions error:', error)
    throw new Error(`Failed to fetch admissions: ${error.message}`)
  }
}

/**
 * Search admissions by query string
 * GET /api/admissions/search?query={query}
 */
export async function searchAdmissions(query) {
  try {
    if (!query || query.trim().length === 0) {
      return []
    }

    const headers = getAuthHeader()
    if (!headers) throw new Error('Not authenticated')

    const params = new URLSearchParams({ query })

    const response = await fetch(`${ADMISSIONS_API}/search?${params.toString()}`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const json = await response.json()

    if (!json.success) {
      throw new Error(json.message || 'Search failed')
    }

    return json.data || []
  } catch (error) {
    console.error('searchAdmissions error:', error)
    throw new Error(`Search failed: ${error.message}`)
  }
}

/**
 * Get admission details by ID
 * GET /api/admissions/{applicationId}
 */
export async function getAdmissionById(applicationId) {
  try {
    if (!applicationId) throw new Error('Application ID required')

    const headers = getAuthHeader()
    if (!headers) throw new Error('Not authenticated')

    const response = await fetch(`${ADMISSIONS_API}/${applicationId}`, {
      method: 'GET',
      headers
    })

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Application not found')
      }
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    const json = await response.json()

    if (!json.success) {
      throw new Error(json.message || 'Failed to fetch application')
    }

    return json.data
  } catch (error) {
    console.error('getAdmissionById error:', error)
    throw new Error(`Failed to fetch application: ${error.message}`)
  }
}

/**
 * Create new admission application
 * POST /api/admissions/create
 * Payload: { lead_id, student: {}, parents: [], academic: {}, documents: [], academic_year_id }
 */
export async function createAdmission(payload) {
  try {
    if (!payload) throw new Error('Payload required')

    const headers = getAuthHeader()
    if (!headers) throw new Error('Not authenticated')

    // If payload is FormData (contains files), don't set Content-Type
    // Otherwise, ensure it's JSON
    const isFormData = payload instanceof FormData
    const fetchHeaders = isFormData ? { ...headers } : headers
    delete fetchHeaders['Content-Type'] // Let browser set it for FormData

    const response = await fetch(`${ADMISSIONS_API}/create`, {
      method: 'POST',
      headers: fetchHeaders,
      body: isFormData ? payload : JSON.stringify(payload)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`)
    }

    const json = await response.json()

    if (!json.success) {
      throw new Error(json.message || 'Failed to create application')
    }

    return {
      success: true,
      data: json.data,
      admission_id: json.admission_id,
      message: json.message
    }
  } catch (error) {
    console.error('createAdmission error:', error)
    throw new Error(`Failed to create application: ${error.message}`)
  }
}
