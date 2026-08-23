import { getAuthHeader, getUserData } from '../utils/authToken.js';

const BASE_URL = '/api/applications';

const NUMBER_TO_STEP = {
  1: 'student',
  2: 'parent',
  3: 'academic',
  4: 'documents',
  5: 'documents',
  6: 'review',
};

const resolveAdmissionId = (candidateId) => {
  if (candidateId !== undefined && candidateId !== null && String(candidateId).trim() !== '') {
    return Number(candidateId);
  }

  const storedId = sessionStorage.getItem('activeAdmissionId');
  if (storedId && storedId.trim() !== '') {
    return Number(storedId);
  }

  return null;
};

const request = async (url, options = {}) => {
  const authHeaders = getAuthHeader() || {};
  const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
  const mergedHeaders = {
    ...authHeaders,
    ...(options.headers || {}),
  };

  if (isFormData) {
    delete mergedHeaders['Content-Type'];
  } else {
    mergedHeaders['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, {
    ...options,
    headers: mergedHeaders,
  });

  const responseText = await response.text().catch(() => '');
  let data = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = null;
    }
  }

  if (!response.ok || !data?.success) {
    const serverMessage = data?.message || data?.error;
    if (response.status === 413) {
      throw new Error(serverMessage || 'File too large. Max size is 5MB');
    }

    throw new Error(serverMessage || `HTTP ${response.status}: ${response.statusText}`);
  }

  return data;
};

/**
 * Create a new application from a lead
 */
export async function createApplicationFromLead(leadId, academicYearId) {
  const data = await request(`${BASE_URL}`, {
    method: 'POST',
    body: JSON.stringify({ lead_id: leadId, academic_year_id: academicYearId }),
  });

  return {
    id: data.data.id,
    admission_id: data.data.id,
    current_step: Number(data.data.current_step || 1),
    status: data.data.status,
    resumed: false,
  };
}

export async function createApplicationWithoutLead(academicYearId) {
  const data = await request(`${BASE_URL}/new`, {
    method: 'POST',
    body: JSON.stringify({ academic_year_id: academicYearId }),
  });

  return {
    id: data.data.id,
    admission_id: data.data.id,
    current_step: Number(data.data.current_step || 1),
    status: data.data.status,
    resumed: false,
  };
}

export async function getEligibleLeads(searchQuery = '', limit = 10) {
  const params = new URLSearchParams();

  if (searchQuery && searchQuery.trim()) {
    params.append('search', searchQuery.trim());
  }

  if (limit) {
    params.append('limit', String(limit));
  }

  const data = await request(`${BASE_URL}/eligible-leads?${params.toString()}`, {
    method: 'GET',
  });

  return Array.isArray(data.data) ? data.data : [];
}

export async function getApplicationCounts() {
  const data = await request(`${BASE_URL}/counts`, {
    method: 'GET',
  });

  return data.data || {
    total: 0,
    submitted: 0,
    under_review: 0,
    approved: 0,
    waitlisted: 0,
    draft: 0,
  };
}

export async function getDraftApplications() {
  const data = await request(`${BASE_URL}/draft`, {
    method: 'GET',
  });

  return Array.isArray(data.data) ? data.data : [];
}

export async function getApplications({ limit = 100, offset = 0 } = {}) {
  const params = new URLSearchParams({
    limit: String(limit),
    offset: String(offset),
  });

  const data = await request(`${BASE_URL}?${params.toString()}`, {
    method: 'GET',
  });

  return Array.isArray(data.data) ? data.data : [];
}

export async function searchApplications(queryText, limit = 100) {
  if (!queryText || !String(queryText).trim()) {
    return [];
  }

  const params = new URLSearchParams({
    query: String(queryText).trim(),
    limit: String(limit),
  });

  const data = await request(`${BASE_URL}/search?${params.toString()}`, {
    method: 'GET',
  });

  return Array.isArray(data.data) ? data.data : [];
}

export async function resumeDraftApplication(applicationId) {
  const data = await request(`${BASE_URL}/${applicationId}/resume`, {
    method: 'GET',
  });

  return data.data;
}

/**
 * Get application progress and step status
 */
export async function getApplicationProgress(applicationId) {
  const data = await request(`${BASE_URL}/${applicationId}/progress`, {
    method: 'GET',
  });

  const currentStep = Number(data?.data?.current_step || 1);

  return {
    current_step: currentStep,
    status: data?.data?.status,
    steps: data?.data?.steps || {},
  };
}

/**
 * Get application details for prefill
 */
export async function getApplicationDetails(applicationId) {
  try {
    const data = await request(`${BASE_URL}/${applicationId}/details`, {
      method: 'GET',
    });

    return {
      application: data.data.application || data.data.admission,
      student_info: data.data.student_info || data.data.student || {},
      parent_info: data.data.parent_info || data.data.parent || {},
      academic_info: data.data.academic_info || data.data.academic || {},
      photos: data.data.photos || {},
      documents: data.data.documents || {},
      current_step: data.data.application?.current_step,
    };
  } catch (error) {
    console.warn('Falling back to empty application details:', error.message);

    return {
      application: { id: Number(applicationId) || applicationId, current_step: 1 },
      student_info: {},
      parent_info: {},
      academic_info: {},
      photos: {},
      documents: {},
      current_step: 1,
    };
  }
}

/**
 * Save student info (Step 1)
 */
export async function saveStudentInfo(applicationId, studentData) {
  const admissionId = resolveAdmissionId(applicationId);
  if (!admissionId || Number.isNaN(admissionId)) {
    throw new Error('Admission ID is missing. Please restart the application flow from Create Application.');
  }

  return request(`${BASE_URL}/${admissionId}/student-info`, {
    method: 'POST',
    body: JSON.stringify(studentData),
  });
}

/**
 * Save parent info (Step 2)
 */
export async function saveParentInfo(applicationId, parentData) {
  const admissionId = resolveAdmissionId(applicationId);
  if (!admissionId || Number.isNaN(admissionId)) {
    throw new Error('Admission ID is missing. Please restart the application flow from Create Application.');
  }

  return request(`${BASE_URL}/${admissionId}/parent-info`, {
    method: 'POST',
    body: JSON.stringify(parentData),
  });
}

/**
 * Save academic info (Step 3)
 */
export async function saveAcademicInfo(applicationId, academicData) {
  const resolvedApplicationId = Number(academicData?.application_id ?? resolveAdmissionId(applicationId));
  if (!resolvedApplicationId || Number.isNaN(resolvedApplicationId)) {
    throw new Error('Application ID is missing. Please restart the application flow from Create Application.');
  }

  const userData = getUserData() || {};
  const resolvedSchoolId = Number(academicData?.school_id ?? userData.school_id);
  if (!resolvedSchoolId || Number.isNaN(resolvedSchoolId)) {
    throw new Error('School ID is missing from session. Please login again and retry.');
  }

  const payload = {
    application_id: resolvedApplicationId,
    school_id: resolvedSchoolId,
    desired_class: academicData?.desired_class || '',
    previous_school: academicData?.previous_school || null,
    previous_class: academicData?.previous_class || null,
    marks_percentage: academicData?.marks_percentage === '' ? null : academicData?.marks_percentage ?? null,
    board_name: academicData?.board_name || null,
    academic_year: academicData?.academic_year || null,
    additional_qualifications: academicData?.additional_qualifications || null,
    extracurricular_activities: academicData?.extracurricular_activities || null,
    achievements: academicData?.achievements || null,
  };

  return request(`/api/applications/${resolvedApplicationId}/academic-info`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

/**
 * Save documents (Step 5)
 */
export async function saveDocuments(applicationId, documents) {
  const admissionId = resolveAdmissionId(applicationId);
  if (!admissionId || Number.isNaN(admissionId)) {
    throw new Error('Admission ID is missing. Please restart the application flow from Create Application.');
  }

  const payload = documents || {};
  const formData = new FormData();
  formData.append('payload', JSON.stringify(payload));

  const appendFile = (prefix, type, entry) => {
    const file = entry?.file;
    if (file instanceof File) {
      formData.append(`${prefix}_${type}`, file, file.name);
    }
  };

  Object.entries(payload.photos || {}).forEach(([type, entry]) => appendFile('photo', type, entry));
  Object.entries(payload.documents || {}).forEach(([type, entry]) => appendFile('document', type, entry));

  return request(`${BASE_URL}/${admissionId}/documents`, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Submit application (Step 6 - Final)
 */
export async function submitApplication(applicationId) {
  return request(`${BASE_URL}/${applicationId}/submit`, {
    method: 'POST',
  });
}

export async function deleteApplication(applicationId) {
  return fetchWithAuth(`/api/applications/${applicationId}`, {
    method: 'DELETE',
  });
}

export function mapStepNumberToKey(stepNumber) {
  return NUMBER_TO_STEP[stepNumber] || 'student';
}
