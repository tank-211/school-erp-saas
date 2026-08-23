import { useState, useEffect } from 'react';
import axios from 'axios';
import { getAuthHeader } from '../utils/authToken';

/**
 * useUpcomingFollowups
 * Custom hook to fetch upcoming follow-ups for the dashboard widget
 * 
 * @param {number} interval - Days interval for follow-up calculation (default: 2)
 * @param {number} limit - Maximum records to return (default: 10)
 * @param {boolean} autoFetch - Whether to fetch data on mount (default: true)
 * @returns {Object} { followups, loading, error, refetch }
 * 
 * Response shape:
 * [
 *   {
 *     id,
 *     first_name,
 *     last_name,
 *     phone,
 *     email,
 *     follow_up_status,
 *     last_contacted_at,
 *     next_follow_up_date,
 *     assigned_to,
 *     desired_class,
 *     priority ('overdue', 'today', 'upcoming')
 *   }
 * ]
 */
export const useUpcomingFollowups = (interval = 2, limit = 10, autoFetch = true) => {
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchFollowups = async (signal) => {
    setLoading(true);
    setError(null);
    try {
      const headers = getAuthHeader();
      if (!headers) throw new Error('Not authenticated');

      const response = await axios.get(
        `/api/leads/followups/upcoming?interval=${interval}&limit=${limit}`,
        { signal, headers }
      );

      if (response.data.success) {
        setFollowups(response.data.data || []);
      } else {
        setError(response.data.message || 'Failed to fetch follow-ups');
      }
    } catch (err) {
      if (err.name !== 'CanceledError') {
        console.error('Error fetching upcoming follow-ups:', err);
        setError(err.response?.data?.message || err.message || 'Failed to load follow-ups');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!autoFetch) return;

    const controller = new AbortController();
    fetchFollowups(controller.signal);

    return () => controller.abort();
  }, [interval, limit, autoFetch]);

  const refetch = () => {
    const controller = new AbortController();
    fetchFollowups(controller.signal);
  };

  return {
    followups,
    loading,
    error,
    refetch,
  };
};
