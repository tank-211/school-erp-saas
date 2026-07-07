import * as communicationService from '../services/communicationService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { logError } from '../utils/logger.js';
import prisma from '../src/lib/prisma.js';

export const sendCommunication = async (req, res, next) => {
  try {
    const data = await communicationService.sendCommunication(
      req.user?.school_id,
      req.user?.id,
      req.body,
      req.files || [],
    );

    const successMessage = data?.scheduled
      ? 'Email scheduled successfully'
      : 'Email sent successfully';

    return sendSuccess(res, data, successMessage, 201);
  } catch (error) {
    logError('Communication send failed', { error: error.message });
    return next(error);
  }
};

export const getCommunicationLogs = async (req, res, next) => {
  try {
    const data = await communicationService.getCommunicationLogs(req.user.school_id, req.query);
    return sendSuccess(res, data.logs, 'Communication logs retrieved successfully.', 200, data.pagination);
  } catch (error) {
    logError('Communication log fetch failed', { error: error.message });
    return next(error);
  }
};

export const updateCommunicationStatus = async (req, res, next) => {
  try {
    const data = await communicationService.updateCommunicationStatus(req.user.school_id, req.params.id, req.body);
    return sendSuccess(res, data, 'Communication status updated successfully.');
  } catch (error) {
    logError('Communication status update failed', { error: error.message, id: req.params.id });
    return next(error);
  }
};

export const getRecipients = async (req, res, next) => {
  try {
    const data = await communicationService.getRecipients(req.user.school_id, req.query.type, req.query.search);
    return sendSuccess(res, data, 'Recipients retrieved successfully.');
  } catch (error) {
    logError('Recipient fetch failed', { error: error.message, type: req.query.type });
    return next(error);
  }
};
