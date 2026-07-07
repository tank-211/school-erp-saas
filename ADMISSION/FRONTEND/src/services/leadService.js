/**
 * services/leadService.js
 * API service for Lead management
 * All functions interact with backend /api/leads endpoints
 */

import { getAuthHeader } from '../utils/authToken.js';

const API_BASE_URL = '/api/leads';

/**
 * createLead(formData)
 * POST /api/leads
 * Creates a new lead
 * @param {Object} formData - Form data from AddLead component
 * @returns {Object} { success, data, message }
 */
export const createLead = async (formData) => {
  try {
    const headers = getAuthHeader();
    if (!headers) {
      throw new Error('Not authenticated. Please login first.');
    }

    // Transform form data to API payload
    const payload = transformFormToApiPayload(formData);

    const response = await fetch(API_BASE_URL, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Error creating lead: ${response.status}`);
    }

    return {
      success: true,
      data: data.data,
      message: data.message || 'Lead created successfully',
    };
  } catch (error) {
    console.error('createLead error:', error);
    return {
      success: false,
      message: error.message || 'Failed to create lead',
    };
  }
};

/**
 * getAllLeads(filters)
 * GET /api/leads?follow_up_status=X&desired_class=Y&assigned_to=Z
 * Fetches all leads with optional filters
 * @param {Object} filters - { follow_up_status, desired_class, assigned_to }
 * @returns {Object} { success, data, message }
 */
export const getAllLeads = async (filters = {}) => {
  try {
    const headers = getAuthHeader();
    if (!headers) {
      throw new Error('Not authenticated. Please login first.');
    }

    // Build query string from filters
    const params = new URLSearchParams();
    if (filters.follow_up_status && filters.follow_up_status !== 'all') {
      params.append('follow_up_status', filters.follow_up_status);
    }
    if (filters.desired_class && filters.desired_class !== 'all') {
      params.append('desired_class', filters.desired_class);
    }
    if (filters.assigned_to && filters.assigned_to !== 'all') {
      params.append('assigned_to', filters.assigned_to);
    }

    const url = params.toString() ? `${API_BASE_URL}?${params.toString()}` : API_BASE_URL;

    const response = await fetch(url, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Error fetching leads: ${response.status}`);
    }

    return {
      success: true,
      data: data.data || [],
      message: 'Leads fetched successfully',
    };
  } catch (error) {
    console.error('getAllLeads error:', error);
    return {
      success: false,
      data: [],
      message: error.message || 'Failed to fetch leads',
    };
  }
};

/**
 * getLeadById(id)
 * GET /api/leads/:id
 * Fetches a single lead by ID
 * @param {Number} id - Lead ID
 * @returns {Object} { success, data, message }
 */
export const getLeadById = async (id) => {
  try {
    const headers = getAuthHeader();
    if (!headers) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'GET',
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Error fetching lead: ${response.status}`);
    }

    return {
      success: true,
      data: data.data,
      message: 'Lead fetched successfully',
    };
  } catch (error) {
    console.error('getLeadById error:', error);
    return {
      success: false,
      message: error.message || 'Failed to fetch lead',
    };
  }
};

/**
 * updateLead(id, updateData)
 * PUT /api/leads/:id
 * Updates an existing lead
 * @param {Number} id - Lead ID
 * @param {Object} updateData - Fields to update (partial)
 * @returns {Object} { success, data, message }
 */
export const updateLead = async (id, updateData) => {
  try {
    const headers = getAuthHeader();
    if (!headers) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(updateData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Error updating lead: ${response.status}`);
    }

    return {
      success: true,
      data: data.data,
      message: data.message || 'Lead updated successfully',
    };
  } catch (error) {
    console.error('updateLead error:', error);
    return {
      success: false,
      message: error.message || 'Failed to update lead',
    };
  }
};

/**
 * deleteLead(id)
 * DELETE /api/leads/:id
 * Deletes a lead
 * @param {Number} id - Lead ID
 * @returns {Object} { success, message }
 */
export const deleteLead = async (id) => {
  try {
    const headers = getAuthHeader();
    if (!headers) {
      throw new Error('Not authenticated. Please login first.');
    }

    const response = await fetch(`${API_BASE_URL}/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (response.status === 204) {
      return {
        success: true,
        message: 'Lead deleted successfully',
      };
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || `Error deleting lead: ${response.status}`);
    }

    return {
      success: true,
      message: 'Lead deleted successfully',
    };
  } catch (error) {
    console.error('deleteLead error:', error);
    return {
      success: false,
      message: error.message || 'Failed to delete lead',
    };
  }
};

/**
 * transformFormToApiPayload(formData)
 * Transforms AddLead.jsx form data to API payload format
 * Maps frontend form fields to backend database columns
 */
const transformFormToApiPayload = (formData) => {
  // Parse student name into first_name and last_name
  const nameParts = (formData.studentName || '').trim().split(/\s+/);
  const first_name = nameParts[0] || '';
  const last_name = nameParts.slice(1).join(' ') || '';

  // Use father's phone as primary contact (required)
  const phone = formData.fatherPhone || '';

  // Map form fields to API payload
  return {
    first_name,
    last_name,
    email: formData.fatherEmail || formData.motherEmail || '',
    phone,
    desired_class: formData.grade || null,
    source: formData.leadSource || null,
    follow_up_status: 'pending',
    notes: buildNotesFromForm(formData),
    // FIX: Map the name to the ID before sending to the API
    assigned_to: formData.counselor ? mapCounselorNameToUserId(formData.counselor) : null,
    
    academic_year_id: null,
    follow_up_date: null,
    
  };
};

/**
 * Build comprehensive notes from form data
 */
const buildNotesFromForm = (formData) => {
  const notes = [];

  if (formData.currentSchool) notes.push(`Current School: ${formData.currentSchool}`);
  if (formData.fatherName) notes.push(`Father: ${formData.fatherName} (${formData.fatherOccupation || 'N/A'})`);
  if (formData.motherName) notes.push(`Mother: ${formData.motherName} (${formData.motherOccupation || 'N/A'})`);
  if (formData.dob) notes.push(`DOB: ${formData.dob}`);
  if (formData.gender) notes.push(`Gender: ${formData.gender}`);
  if (formData.address) notes.push(`Address: ${formData.address}, ${formData.city || ''}, ${formData.state || ''} ${formData.pin || ''}`);
  if (formData.referredBy) notes.push(`Referred By: ${formData.referredBy}`);
  if (formData.priority) notes.push(`Priority: ${formData.priority}`);
  if (formData.notes) notes.push(`Notes: ${formData.notes}`);

  return notes.join('\n');
};

/**
 * mapCounselorNameToUserId(counselorName)
 * Maps counselor name from form to user_id for API
 * TODO: Replace with actual API call to fetch users
 */
export const mapCounselorNameToUserId = (counselorName) => {
  // Hardcoded mapping for now - should be replaced with API call
  const counselorMap = {
    'Priya Sharma': 2,
    'Amit_Patel': 3,
    'Neha Kumar': 4,
    'Rahul Singh': 5,
    'Anjali Gupta': 6,
  };
  return counselorMap[counselorName] || null;
};
