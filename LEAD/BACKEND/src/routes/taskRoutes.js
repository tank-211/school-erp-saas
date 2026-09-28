import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { requireOwnedTask } from "../middlewares/tenantGuards.js";
import {
  getTasks,
  createTask,
  deleteTask,
  updateTaskStatus,
  updateTask
} from "../controllers/taskController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getTasks);
router.post("/", createTask);
router.delete("/:id", requireOwnedTask, deleteTask);
router.put("/:id/status", requireOwnedTask, updateTaskStatus);
router.put("/:id", requireOwnedTask, updateTask);
export default router;