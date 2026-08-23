import * as whatsappService from '../services/whatsapp.service.js';
import { sendSuccess } from '../utils/apiResponse.js';

export const sendWhatsapp = async (req, res, next) => {
  try {
    const data = await whatsappService.sendWhatsapp(req.user.school_id, req.user.id, req.body);
    return sendSuccess(res, data, 'WhatsApp message sent successfully.', 201);
  } catch (error) {
    return next(error);
  }
};

export const getWhatsappLogs = async (req, res, next) => {
  try {
    const data = await whatsappService.getWhatsappLogs(req.user.school_id, req.query);
    return res.json({
      success: true,
      data: data
    });
  } catch (error) {
    return next(error);
  }
};
