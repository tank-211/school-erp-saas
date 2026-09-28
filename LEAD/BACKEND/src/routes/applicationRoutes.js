import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwnedApplication, requireOwnedDocument } from "../middlewares/tenantGuards.js";
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

router.put("/:id/status", requireOwnedApplication, updateApplicationStatus);

router.get("/:id", getApplicationById);

router.post(
  "/from-lead/:leadId",
  createApplicationFromLead
);

router.post(
  "/:id/documents",
  requireOwnedApplication, // before multer so no file is stored for another school
  upload.single("file"),
  addDocument
);

router.put(
  "/document/:documentId/verify",
  requireOwnedDocument,
  verifyDocument
);

router.delete(
  "/document/:documentId",
  requireOwnedDocument,
  deleteDocument
);

router.put(
  "/:id/student",
  requireOwnedApplication,
  updateStudentInfo
);

router.put(
  "/:id/parent",
  requireOwnedApplication,
  updateParentInfo
);

export default router;