import {
  getTasksService,
  createTaskService,
  deleteTaskService,
  updateTaskStatusService,
  updateTaskService
} from "../services/taskService.js";

// Tasks are school-scoped: list/create use the token's school, and the :id routes
// are guarded by requireOwnedTask (middlewares/tenantGuards.js).

const toSafeJson = (value) =>
  JSON.parse(
    JSON.stringify(value, (_, v) => (typeof v === "bigint" ? v.toString() : v))
  );

const sendError = (res, error) => {
  console.error("TASK ERROR:", error.message);
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message
  });
};

export const getTasks = async (req, res) => {
  try {
    const tasks = await getTasksService(req.user.schoolId);
    res.json({
      success: true,
      data: toSafeJson(tasks),
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const createTask = async (req, res) => {
  try {
    const task = await createTaskService(
      req.body,
      req.user.schoolId
    );
    res.json({
      success: true,
      data: toSafeJson(task)
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const deleteTask = async (req, res) => {
  try {
    await deleteTaskService(req.params.id, req.user.schoolId);
    res.json({
      success: true,
      message: "Task deleted"
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateTaskStatus = async (req, res) => {
  try {
    const task = await updateTaskStatusService(
      req.params.id,
      req.body.status
    );
    res.json({
      success: true,
      data: toSafeJson(task)
    });
  } catch (error) {
    sendError(res, error);
  }
};

export const updateTask = async (req, res) => {
  try {
    const task = await updateTaskService(
      req.params.id,
      req.body,
      req.user.schoolId
    );
    res.json({
      success: true,
      data: toSafeJson(task)
    });
  } catch (error) {
    sendError(res, error);
  }
};
