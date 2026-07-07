import * as campaignService from '../services/campaignService.js';
import { sendSuccess } from '../utils/apiResponse.js';
import { logError } from '../utils/logger.js';
import prisma from '../src/lib/prisma.js';

export const createCampaign = async (req, res, next) => {
  try {
    const data = await campaignService.createCampaign(req.user.school_id, req.body);
    return sendSuccess(res, data, 'Campaign created successfully.', 201);
  } catch (error) {
    logError('Campaign create failed', { error: error.message });
    return next(error);
  }
};

export const getCampaigns = async (req, res, next) => {
  try {
    const data = await campaignService.getCampaigns(req.user.school_id, req.query.status);
    return sendSuccess(res, data, 'Campaigns retrieved successfully.');
  } catch (error) {
    logError('Campaign fetch failed', { error: error.message });
    return next(error);
  }
};

export const sendCampaign = async (req, res, next) => {
  try {
    const data = await campaignService.sendCampaign(req.user.school_id, req.user.id, req.params.id, req.body);
    return sendSuccess(res, data, 'Campaign sent successfully.');
  } catch (error) {
    logError('Campaign send failed', { error: error.message, id: req.params.id });
    return next(error);
  }
};
