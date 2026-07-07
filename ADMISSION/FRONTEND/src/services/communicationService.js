import { getAuthHeader, getToken } from '../utils/authToken.js';

const request = async (base, path, options = {}) => {
  const headers = getAuthHeader();

  if (!headers) {
    throw new Error('Not authenticated. Please login first.');
  }

  const response = await fetch(`${base}${path}`, {
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

const buildQuerySuffix = (path, query = {}) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      params.append(key, String(value));
    }
  });

  return params.toString() ? `${path}?${params.toString()}` : path;
};

export const fetchSmsLogs = async (query = {}) => {
  const response = await request('/api/sms', buildQuerySuffix('/logs', query), { method: 'GET' });
  return {
    logs: response.data || [],
    pagination: response.meta || null,
  };
};

export const sendSmsMessage = async (payload) => {
  const response = await request('/api/sms', '/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
};

export const fetchWhatsappLogs = async (query = {}) => {
  const response = await request('/api/whatsapp', buildQuerySuffix('/logs', query), { method: 'GET' });
  return {
    logs: response.data || [],
    pagination: response.meta || null,
  };
};

export const sendWhatsappMessage = async (payload) => {
  const response = await request('/api/whatsapp', '/send', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
};

export const fetchCampaigns = async () => {
  const response = await request('/api/campaigns', '', { method: 'GET' });
  return response.data || [];
};

export const createCampaign = async (payload) => {
  const response = await request('/api/campaigns', '', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
};

export const sendCampaignNow = async (campaignId, payload) => {
  const response = await request('/api/campaigns', `/${campaignId}/send`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  return response.data;
};

export const fetchCommunicationRecipientsByType = async (type, search = '') => {
  const response = await request('/api/communication', buildQuerySuffix('/recipients', { type, search }), {
    method: 'GET',
  });

  return response.data || [];
};

export const fetchAllCommunicationRecipients = async (search = '') => {
  const recipientTypes = ['lead', 'student', 'parent'];
  const groupedRecipients = await Promise.all(
    recipientTypes.map(async (type) => {
      const recipients = await fetchCommunicationRecipientsByType(type, search);
      return recipients.map((recipient) => ({
        ...recipient,
        recipient_type: type,
      }));
    })
  );

  return groupedRecipients.flat();
};

export const sendComposeEmail = async (formData) => {
  const token = getToken();

  if (!token) {
    throw new Error('Not authenticated. Please login first.');
  }

  const response = await fetch('/api/communication/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
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

  return data.data;
};
