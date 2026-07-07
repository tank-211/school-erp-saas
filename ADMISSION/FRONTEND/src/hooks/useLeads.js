/**
 * Custom React hooks for Leads module
 * Encapsulates data fetching, loading, and error states
 */

import { useState, useEffect } from 'react'
import { getAuthHeader } from '../utils/authToken.js'
import { getEligibleLeads } from '../services/applicationService.js'

/**
 * Hook to fetch and search leads
 * Returns: { leads, loading, error }
 */
export function useLeads(searchQuery = '', excludeSubmitted = false) {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchLeads = async () => {
      try {
        setLoading(true)
        setError(null)

        if (excludeSubmitted) {
          const eligible = await getEligibleLeads(searchQuery, 10)
          setLeads(eligible)
          return
        }

        const params = new URLSearchParams()
        if (searchQuery && searchQuery.trim().length >= 2) {
          params.append('search', searchQuery)
        } else if (!searchQuery) {
          params.append('limit', '10')
        }

        const response = await fetch(`/api/leads?${params.toString()}`, {
          method: 'GET',
          headers: getAuthHeader() || { 'Content-Type': 'application/json' }
        })

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const json = await response.json()

        if (!json.success) {
          throw new Error(json.message || 'Failed to fetch leads')
        }

        setLeads(Array.isArray(json.data) ? json.data : [])
      } catch (err) {
        setError(err.message)
        console.error('Error fetching leads:', err)
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timer = setTimeout(fetchLeads, searchQuery ? 300 : 0)
    return () => clearTimeout(timer)
  }, [searchQuery, excludeSubmitted])

  return { leads, loading, error }
}

/**
 * Hook to create a new admission from a lead
 * Returns: { createAdmission, loading, error, success }
 */
export function useCreateAdmission() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const createAdmission = async (payload) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)

      const isFormData = payload instanceof FormData
      const headers = {
        'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
      }

      // Don't set Content-Type for FormData - let browser set it with boundary
      if (!isFormData) {
        headers['Content-Type'] = 'application/json'
      }

      const response = await fetch('/api/admissions', {
        method: 'POST',
        headers,
        body: isFormData ? payload : JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP ${response.status}`)
      }

      const json = await response.json()

      if (!json.success) {
        throw new Error(json.message || 'Failed to create admission')
      }

      setSuccess(true)
      return json.data
    } catch (err) {
      setError(err.message)
      console.error('Error creating admission:', err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { createAdmission, loading, error, success }
}
