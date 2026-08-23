import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import upload from "../middlewares/upload.js";
import {
  getApplications,
  getApplicationStats,
  createApplicationFromLead,
  getApplicationById,
  addDocument,
  verifyDocument,
  updateApplicationStatus,
  deleteDocument,
  updateStudentInfo,
  updateParentInfo
} from "../controllers/applicationController.js";



const router = express.Router();

router.use(authMiddleware);

router.get("/", getApplications);

router.get("/stats", getApplicationStats);

router.put("/:id/status", updateApplicationStatus);

router.get("/:id", getApplicationById);

router.post(
  "/from-lead/:leadId",
  createApplicationFromLead
);

router.post(
  "/:id/documents",
  upload.single("file"),
  addDocument
);

router.put(
  "/document/:documentId/verify",
  verifyDocument
);

router.delete(
  "/document/:documentId",
  deleteDocument
);

router.put(
  "/:id/student",
  updateStudentInfo
);

router.put(
  "/:id/parent",
  updateParentInfo
);

export default router;