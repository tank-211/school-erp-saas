/**
 * Custom React hooks for Admissions module
 * Encapsulates data fetching, loading, and error states
 */

import { useState, useEffect } from 'react'
import { getAdmissionStats, getAdmissions, searchAdmissions } from '../services/admissionService'

/**
 * Hook to fetch admission statistics
 * Returns: { stats, loading, error }
 */
export function useAdmissionStats() {
  const [stats, setStats] = useState({
    total: 0,
    submitted: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
    waitlisted: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true)
        const data = await getAdmissionStats()
        setStats(data)
        setError(null)
      } catch (err) {
        setError(err.message)
        console.error('Error fetching stats:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  return { stats, loading, error }
}

/**
 * Hook to fetch paginated admissions
 * Returns: { admissions, loading, error, refetch }
 */
export function useAdmissions(limit = 10, offset = 0) {
  const [admissions, setAdmissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchAdmissions = async () => {
    try {
      setLoading(true)
      const data = await getAdmissions({ limit, offset })
      const appsList = Array.isArray(data)
        ? data
        : (data?.applications || data?.data || [])
      setAdmissions(appsList)
      setError(null)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching admissions:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAdmissions()
  }, [limit, offset])

  return { admissions, loading, error, refetch: fetchAdmissions }
}

/**
 * Hook to search admissions
 * Returns: { results, loading, error }
 */
export function useSearchAdmissions(query) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!query || query.trim().length === 0) {
      setResults([])
      setError(null)
      return
    }

    const performSearch = async () => {
      try {
        setLoading(true)
        const data = await searchAdmissions(query)
        setResults(Array.isArray(data) ? data : (data?.applications || []))
        setError(null)
      } catch (err) {
        setError(err.message)
        console.error('Error searching admissions:', err)
      } finally {
        setLoading(false)
      }
    }

    // Debounce search
    const timer = setTimeout(performSearch, 300)
    return () => clearTimeout(timer)
  }, [query])

  return { results, loading, error }
}
