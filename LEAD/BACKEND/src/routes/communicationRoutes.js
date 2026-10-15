import express from "express";
import {
  sendEmail,
  logCall,
  logWhatsApp,
  logSMS,
  listCommunications,
  getCommunicationHistory,
  updateCommunication,
  deleteCommunication,
  getChannels,
} from "../controllers/communicationController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwnedLeadParam, requireOwnedCommunication } from "../middlewares/tenantGuards.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { emailSchema, callSchema } from "../utils/validators.js";

const router = express.Router();

router.use(authMiddleware);
// All messages of the school with lead and staff names (?channel=&search=&page=&limit=)
router.get("/", listCommunications);
// Which of email / SMS / WhatsApp the school can send through
router.get("/channels", getChannels);
router.post("/email", validate(emailSchema), sendEmail);
router.post("/call", validate(callSchema), logCall);
router.post("/whatsapp", logWhatsApp);
router.post("/sms", logSMS);
router.get("/history/:leadId", requireOwnedLeadParam, getCommunicationHistory);
router.put("/:id", requireOwnedCommunication, updateCommunication);
router.delete("/:id", requireOwnedCommunication, deleteCommunication);

export default router;
