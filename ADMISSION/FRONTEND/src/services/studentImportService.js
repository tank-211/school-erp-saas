/**
 * services/studentImportService.js
 * Import of the school's existing students (/api/student-import, school admins).
 */
import axios from 'axios';
import { getAuthHeader } from '../utils/authToken.js';

const API_BASE_URL = '/api/student-import';

const call = async (method, path, data) => {
  try {
    const response = await axios({ method, url: `${API_BASE_URL}${path}`, data, headers: getAuthHeader() });
    if (response.data && response.data.success) return response.data;
    throw new Error(response.data?.message || 'Request failed');
  } catch (error) {
    const e = new Error(error.response?.data?.message || error.message || 'Request failed');
    e.details = error.response?.data?.details || null;
    throw e;
  }
};

const withFile = (file) => {
  const form = new FormData();
  form.append('file', file);
  return form;
};

/** Downloads the Excel template (filled with the school's classes). */
export const downloadTemplate = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/template`, { headers: getAuthHeader(), responseType: 'blob' });
    const url = URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'existing-students-template.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    let message = error.message || 'Could not download the template';
    try {
      const text = await error.response?.data?.text?.();
      if (text) message = JSON.parse(text).message || message;
    } catch { /* keep the generic message */ }
    throw new Error(message);
  }
};

export const previewImport = async (file) => (await call('post', '/preview', withFile(file))).data;
export const runImport = (file) => call('post', '/', withFile(file));
export const fetchBatches = async () => (await call('get', '/batches')).data;
export const undoImport = (id) => call('post', `/batches/${id}/undo`);
export const fetchFollowUp = async () => (await call('get', '/follow-up')).data;
export const assignClass = (admissionId, classId, sectionId) =>
  call('patch', `/admissions/${admissionId}/class`, { class_id: classId, section_id: sectionId });
export const markDocument = (admissionId, documentType, file) => {
  const form = new FormData();
  form.append('document_type', documentType);
  if (file) form.append('file', file);
  return call('post', `/admissions/${admissionId}/documents`, form);
};
