import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
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
router.delete("/:id", deleteTask);
router.put("/:id/status", updateTaskStatus);
router.put("/:id", updateTask);
export default router;