import * as campaignService from '../services/campaign.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import prisma from '../src/lib/prisma.js';
import { serializeBigInt } from '../utils/bigintSerializer.js';

export const createCampaign = async (req, res, next) => {
  try {
    const data = await campaignService.createCampaign(req.user.school_id, req.body);
    return sendSuccess(res, serializeBigInt(data), 'Campaign created successfully.', 201);
  } catch (error) {
    return next(error);
  }
};

export const getCampaigns = async (req, res, next) => {
  try {
    const data = await campaignService.getCampaigns(req.user.school_id);
    return res.json({
      success: true,
      data: serializeBigInt(data)
    });
  } catch (error) {
    return next(error);
  }
};

export const sendCampaign = async (req, res, next) => {
  try {
    const data = await campaignService.sendCampaign(req.user.school_id, req.user.id, req.params.id, req.body);
    const message = data.failed_count
      ? `Sent to ${data.sent_count} of ${data.total_recipients}; ${data.failed_count} failed${data.results.find((r) => r.error)?.error ? ` (${data.results.find((r) => r.error).error})` : ''}.`
      : `Sent to all ${data.sent_count} recipients.`;
    return sendSuccess(res, serializeBigInt(data), message);
  } catch (error) {
    return next(error);
  }
};
