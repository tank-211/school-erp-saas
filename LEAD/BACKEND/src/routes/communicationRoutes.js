import express from "express";
import {
  sendEmail,
  logCall,
  logWhatsApp,
  logSMS,
  getCommunicationHistory,
  updateCommunication,
  deleteCommunication,
} from "../controllers/communicationController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { emailSchema, callSchema } from "../utils/validators.js";

const router = express.Router();

router.use(authMiddleware);
router.post("/email", validate(emailSchema), sendEmail);
router.post("/call", validate(callSchema), logCall);
router.post("/whatsapp", logWhatsApp);
router.post("/sms", logSMS);
router.get("/history/:leadId", getCommunicationHistory);
router.put("/:id", updateCommunication);
router.delete("/:id", deleteCommunication);

export default router;
