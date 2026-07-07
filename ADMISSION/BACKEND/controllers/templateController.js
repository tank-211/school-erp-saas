import * as templateService from '../services/templateService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { logError } from '../utils/logger.js';
import prisma from '../src/lib/prisma.js';

export const createTemplate = async (req, res, next) => {
  try {
    const data = await templateService.createTemplate(req.user.school_id, req.body);
    return sendSuccess(res, data, 'Template created successfully.', 201);
  } catch (error) {
    logError('Template create failed', { error: error.message });
    return next(error);
  }
};

export const getTemplates = async (req, res, next) => {
  try {
    const data = await templateService.getTemplates(req.user.school_id, req.query.category);
    return sendSuccess(res, data, 'Templates retrieved successfully.');
  } catch (error) {
    logError('Template fetch failed', { error: error.message });
    return next(error);
  }
};

export const updateTemplate = async (req, res, next) => {
  try {
    const data = await templateService.updateTemplate(req.user.school_id, req.params.id, req.body);
    return sendSuccess(res, data, 'Template updated successfully.');
  } catch (error) {
    logError('Template update failed', { error: error.message, id: req.params.id });
    return next(error);
  }
};

export const deleteTemplate = async (req, res, next) => {
  try {
    await templateService.deleteTemplate(req.user.school_id, req.params.id);
    return sendSuccess(res, null, 'Template deleted successfully.');
  } catch (error) {
    logError('Template delete failed', { error: error.message, id: req.params.id });
    return next(error);
  }
};
