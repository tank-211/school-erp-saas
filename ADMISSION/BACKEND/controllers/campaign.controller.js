import * as campaignService from '../services/campaign.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import prisma from '../src/lib/prisma.js';

export const createCampaign = async (req, res, next) => {
  try {
    const data = await campaignService.createCampaign(req.user.school_id, req.body);
    return sendSuccess(res, data, 'Campaign created successfully.', 201);
  } catch (error) {
    return next(error);
  }
};

export const getCampaigns = async (req, res, next) => {
  try {
    const data = await campaignService.getCampaigns(req.user.school_id);
    return res.json({
      success: true,
      data: data
    });
  } catch (error) {
    return next(error);
  }
};

export const sendCampaign = async (req, res, next) => {
  try {
    const data = await campaignService.sendCampaign(req.user.school_id, req.user.id, req.params.id, req.body);
    return sendSuccess(res, data, 'Campaign sent successfully.');
  } catch (error) {
    return next(error);
  }
};
