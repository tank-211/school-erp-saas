import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";

import {
  getPipeline,
  moveLeadStage
} from "../controllers/pipelineController.js";

const router = express.Router();

router.use(authMiddleware);

router.get(
  "/",
  getPipeline
);

router.put(
  "/lead/:id/stage",
  moveLeadStage
);

export default router;