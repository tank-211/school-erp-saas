import * as communicationQueries from '../db/queries/communicationQueries.js';
import AppError from '../utils/appError.js';
import { assertPositiveInteger, assertRequiredString } from '../utils/communicationValidation.js';

export const createTemplate = async (schoolId, payload) => {
  assertRequiredString(payload.name, 'name');
  assertRequiredString(payload.content, 'content');

  return communicationQueries.createTemplate(schoolId, {
    name: payload.name.trim(),
    category: payload.category?.trim() || null,
    subject: payload.subject?.trim() || null,
    content: payload.content.trim(),
  });
};

export const getTemplates = async (schoolId, category) => communicationQueries.getTemplates(schoolId, category?.trim());

export const updateTemplate = async (schoolId, templateId, payload) => {
  const id = assertPositiveInteger(templateId, 'template id');
  const updatedTemplate = await communicationQueries.updateTemplate(id, schoolId, {
    name: payload.name?.trim(),
    category: payload.category?.trim(),
    subject: payload.subject?.trim(),
    content: payload.content?.trim(),
  });

  if (!updatedTemplate) {
    throw new AppError('Template not found.', 404);
  }

  return updatedTemplate;
};

export const deleteTemplate = async (schoolId, templateId) => {
  const id = assertPositiveInteger(templateId, 'template id');
  const deleted = await communicationQueries.deleteTemplate(id, schoolId);

  if (!deleted) {
    throw new AppError('Template not found.', 404);
  }
};
