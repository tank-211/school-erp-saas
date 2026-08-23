import {
  sendEmailService,
  logCallService,
  getCommunicationHistoryService,
  updateCommunicationService,
  deleteCommunicationService,
  logWhatsAppService,
  logSMSService,
} from "../services/communicationService.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { serializeBigInt } from "../utils/bigintSerializer.js";


export const logCall = async (req, res) => {
  try {
    const communication = await logCallService(req.body, req.user.id);
    res.status(201).json(
    serializeBigInt(
    successResponse(communication, "Call logged successfully")
  )
);
  } catch (error) {
    res.status(400).json(errorResponse(error.message));
  }
  console.log("USER:", req.user);
  console.log("USERID:", req.user.id);
};

export const getCommunicationHistory = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
    };

    const result = await getCommunicationHistoryService(req.params.leadId, filters);
    res.status(200).json(
  serializeBigInt(
    successResponse(result, "Communication history retrieved successfully")
  )
);
    } catch (error) {
      console.error("COMMUNICATION HISTORY ERROR:");
      console.error(error);

      res.status(500).json({
        success: false,
        message: error.message,
      });
    }
};

export const updateCommunication = async (req, res) => {
  try {
    const communication = await updateCommunicationService(req.params.id, req.body);
    res.status(200).json(
  serializeBigInt(
    successResponse(communication, "Communication updated successfully")
  )
);
  } catch (error) {
    res.status(400).json(errorResponse(error.message));
  }
};

export const deleteCommunication = async (req, res) => {
  try {
    const result = await deleteCommunicationService(req.params.id);
    res.status(200).json(
  serializeBigInt(
    successResponse(result, "Communication deleted successfully")
  )
);
  } catch (error) {
    res.status(404).json(errorResponse(error.message));
  }
};

export const sendEmail = async (req, res) => {
  try {
    console.log("EMAIL BODY:", req.body);
    console.log("USER:", req.user);

    const communication = await sendEmailService(
      {
        ...req.body,
        leadId: parseInt(req.body.leadId),
      },
      req.user.id
    );

    res.status(201).json(
      serializeBigInt({
        success: true,
        data: communication,
      })
    );

  } catch (error) {
    console.error("FULL EMAIL ERROR:");
    console.error(error);

    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const logWhatsApp = async (req, res) => {
  try {
    console.log("WHATSAPP BODY:", req.body);
    const result = await logWhatsAppService(
      req.body,
      req.user.id
    );

    res.status(201).json(
      serializeBigInt({
        success: true,
        data: result,
        message: "WhatsApp logged successfully",
      })
    );

  } catch (error) {
     console.log("WHATSAPP ERROR:", error);
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};
export const logSMS = async (req, res) => {
  try {
    const result = await logSMSService(
      req.body,
      req.user.id
    );

    res.status(201).json(
      serializeBigInt({
        success: true,
        data: result,
        message: "SMS logged successfully",
      })
    );

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message,
    });
  }
};