import { getAuthHeader } from '../utils/authToken.js';

const EMAIL_API_BASE = '/api/email';

const request = async (path, options = {}) => {
  const headers = getAuthHeader();

  if (!headers) {
    throw new Error('Not authenticated. Please login first.');
  }

  const response = await fetch(`${EMAIL_API_BASE}${path}`, {
    ...options,
    headers,
  });

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    data = null;
  }

  if (!response.ok || !data?.success) {
    throw new Error(data?.message || `Request failed with status ${response.status}`);
  }

  return data;
};

export const fetchEmailLogs = async (query = {}) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  const suffix = params.toString() ? `/logs?${params.toString()}` : '/logs';
  const response = await request(suffix, { method: 'GET' });

  return {
    logs: response.data || [],
    pagination: response.meta || null,
  };
};

export const fetchEmailStats = async () => {
  const response = await request('/stats', { method: 'GET' });
  return response.data;
};

export const fetchEmailTemplates = async () => {
  const response = await request('/templates', { method: 'GET' });
  return response.data || [];
};

export const fetchEmailRecipients = async (type, search = '') => {
  const params = new URLSearchParams({ type });

  if (search?.trim()) {
    params.append('search', search.trim());
  }

  const response = await request(`/recipients?${params.toString()}`, { method: 'GET' });
  return response.data || [];
};

export const resolveApplicationRecipient = async (applicationId, targetAudience) => {
  const response = await request('/resolve-recipient', {
    method: 'POST',
    body: JSON.stringify({
      application_id: applicationId,
      target_audience: targetAudience,
    }),
  });

  return response.data;
};

export const sendEmailMessage = async (payload) => {
  const response = await request('/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
};
