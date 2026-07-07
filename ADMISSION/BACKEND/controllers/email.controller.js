import * as emailService from '../services/email.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { logError } from '../utils/logger.js';
import prisma from '../src/lib/prisma.js';

export const sendEmail = async (req, res, next) => {
  try {
    const data = await emailService.sendEmailMessage(req.user.school_id, req.user.id, req.body);
    return sendSuccess(res, data, 'Email sent successfully.', 201);
  } catch (error) {
    logError('Email send failed', { error: error.message, body: req.body });
    return next(error);
  }
};

export const resolveApplicationRecipient = async (req, res, next) => {
  try {
    const data = await emailService.resolveApplicationRecipient(req.user.school_id, req.body);
    return sendSuccess(res, data, 'Application recipient resolved successfully.');
  } catch (error) {
    logError('Resolve application recipient failed', { error: error.message, body: req.body });
    return next(error);
  }
};

export const getEmailLogs = async (req, res, next) => {
  try {
    const data = await emailService.getEmailLogs(req.user.school_id, req.query);
    return sendSuccess(res, data.logs, 'Email logs retrieved successfully.', 200, data.pagination);
  } catch (error) {
    logError('Email log fetch failed', { error: error.message, query: req.query });
    return next(error);
  }
};

export const getEmailStats = async (req, res, next) => {
  try {
    const data = await emailService.getEmailStats(req.user.school_id);
    return sendSuccess(res, data, 'Email stats retrieved successfully.');
  } catch (error) {
    logError('Email stats fetch failed', { error: error.message });
    return next(error);
  }
};

export const updateEmailStatus = async (req, res, next) => {
  try {
    const data = await emailService.updateEmailStatus(req.user.school_id, req.params.id, req.body);
    return sendSuccess(res, data, 'Email status updated successfully.');
  } catch (error) {
    logError('Email status update failed', { error: error.message, id: req.params.id, body: req.body });
    return next(error);
  }
};

export const createTemplate = async (req, res, next) => {
  try {
    const data = await emailService.createTemplate(req.user.school_id, req.body);
    return sendSuccess(res, data, 'Email template created successfully.', 201);
  } catch (error) {
    logError('Create template failed', { error: error.message, body: req.body });
    return next(error);
  }
};

export const getTemplates = async (req, res, next) => {
  try {
    const data = await emailService.getTemplates(req.user.school_id);
    return sendSuccess(res, data, 'Email templates retrieved successfully.');
  } catch (error) {
    logError('Get templates failed', { error: error.message });
    return next(error);
  }
};

export const updateTemplate = async (req, res, next) => {
  try {
    const data = await emailService.updateTemplate(req.user.school_id, req.params.id, req.body);
    return sendSuccess(res, data, 'Email template updated successfully.');
  } catch (error) {
    logError('Update template failed', { error: error.message, id: req.params.id, body: req.body });
    return next(error);
  }
};

export const deleteTemplate = async (req, res, next) => {
  try {
    const data = await emailService.deleteTemplate(req.user.school_id, req.params.id);
    return sendSuccess(res, data, 'Email template deleted successfully.');
  } catch (error) {
    logError('Delete template failed', { error: error.message, id: req.params.id });
    return next(error);
  }
};

export const getRecipients = async (req, res, next) => {
  try {
    const data = await emailService.getRecipients(req.user.school_id, req.query.type, req.query.search);
    return sendSuccess(res, data, 'Recipients retrieved successfully.');
  } catch (error) {
    logError('Get recipients failed', { error: error.message, query: req.query });
    return next(error);
  }
};
