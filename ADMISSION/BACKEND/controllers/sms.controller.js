import * as smsService from '../services/sms.service.js';
import { sendSuccess } from '../utils/apiResponse.js';
import prisma from '../src/lib/prisma.js';

export const sendSms = async (req, res, next) => {
  try {
    const data = await smsService.sendSms(req.user.school_id, req.user.id, req.body);
    return sendSuccess(res, data, 'SMS sent successfully.', 201);
  } catch (error) {
    return next(error);
  }
};

export const getSmsLogs = async (req, res, next) => {
  try {
    const data = await smsService.getSmsLogs(req.user.school_id, req.query);
    return res.json({
      success: true,
      data: data
    });
  } catch (error) {
    return next(error);
  }
};
