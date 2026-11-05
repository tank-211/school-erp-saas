import express from "express";
import multer from "multer";  // ✅ move here

import {
  createLead,
  getLeads,
  getLeadById,
  getLeadDetails,
  updateLead,
  deleteLead,
  bulkCreateLeads,
  assignLead,
  getLeadStats,
  getActivities,
  getTasksByLead,
} from "../controllers/leadController.js";

import { authMiddleware } from "../middlewares/authMiddleware.js";
import { validate } from "../middlewares/validationMiddleware.js";
import { createLeadSchema, updateLeadSchema } from "../utils/validators.js";

const router = express.Router();

const upload = multer({
  dest: "uploads/",
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, callback) => {
    const extension = file.originalname.toLowerCase().split(".").pop();
    if (extension !== "csv" && extension !== "xlsx") {
      return callback(new Error("Only .csv and .xlsx files are supported"));
    }
    callback(null, true);
  },
});

router.use(authMiddleware);

router.post("/", validate(createLeadSchema), createLead);
router.get("/", getLeads);
router.get("/:id/details", authMiddleware, getLeadDetails);
router.post("/bulk", upload.single("file"), bulkCreateLeads); // ✅ correct
router.get("/activities", getActivities);
router.get("/stats", getLeadStats);
router.get("/:id", getLeadById);
router.put("/:id/assign", assignLead);
router.put("/:id", validate(updateLeadSchema), updateLead);
router.delete("/:id", deleteLead);
//router.get("/lead/:leadId", authMiddleware, getTasksByLead);
//router.get("/lead/:leadId/communications", authMiddleware, getCommunicationsByLead);

export default router;