import {
  getTasksService,
  createTaskService,
  deleteTaskService,
  updateTaskStatusService,
  updateTaskService
} from "../services/taskService.js";


export const getTasks = async (req, res) => {
  const tasks = await getTasksService(req.user.schoolId);

  const safeTasks = JSON.parse(
    JSON.stringify(tasks, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

  res.json({
    success: true,
    data: safeTasks,
  });
};

export const createTask = async (req, res) => {
  const task = await createTaskService(
    req.body,
    req.user.schoolId
  );

  const safeTask = JSON.parse(
    JSON.stringify(task, (_, value) =>
      typeof value === "bigint"
        ? value.toString()
        : value
    )
  );

  res.json({
    success: true,
    data: safeTask
  });
};

export const deleteTask = async (req, res) => {
  await deleteTaskService(req.params.id, req.user.schoolId);

  res.json({
    success: true,
    message: "Task deleted"
  });
};

export const updateTaskStatus = async (req, res) => {
  console.log("=== UPDATE TASK STATUS ===");
  console.log("ID:", req.params.id);
  console.log("BODY:", req.body);

  const task = await updateTaskStatusService(
    req.params.id,
    req.body.status
  );

  console.log("UPDATED TASK:", task);

  const safeTask = JSON.parse(
    JSON.stringify(task, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

  res.json({
    success: true,
    data: safeTask
  });
};

export const updateTask = async (req, res) => {
  const task = await updateTaskService(
    req.params.id,
    req.body
  );

  const safeTask = JSON.parse(
    JSON.stringify(task, (_, value) =>
      typeof value === "bigint" ? value.toString() : value
    )
  );

  res.json({
    success: true,
    data: safeTask
  });
};