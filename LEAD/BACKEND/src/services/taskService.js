import prisma from "../prisma/index.js";

export const getTasksService = async (schoolId) => {
  return await prisma.task.findMany({
    where: {
      school_id: BigInt(schoolId),
    },
    include: {
      lead: true,
    },
    orderBy: {
      due_date: "asc",
    },
  });
};

export const createTaskService = async (data, schoolId) => {
  return await prisma.task.create({
    data: {
      school_id: BigInt(schoolId),
      lead_id: data.leadId ? BigInt(data.leadId) : null,
      assigned_to: BigInt(data.assignedTo),
      title: data.title,
      task_description: data.description,
      priority: data.priority?.toLowerCase(),
      due_date: new Date(data.dueDate),
      is_done: data.status === "completed",
    },
  });
};

export const deleteTaskService = async (id) => {
  return await prisma.task.delete({
    where: {
      id: BigInt(id),
    },
  });
};

export const updateTaskStatusService = async (id, status) => {
  return await prisma.task.update({
    where: {
      id: BigInt(id),
    },
    data: {
      is_done: status === "completed",
    },
  });
};

export const updateTaskService = async (id, data) => {
  return await prisma.task.update({
    where: {
      id: BigInt(id),
    },
    data: {
      title: data.title,
      task_description: data.description,
      priority: data.priority?.toLowerCase(),
      due_date: data.dueDate ? new Date(data.dueDate) : undefined,
      lead_id: data.leadId ? BigInt(data.leadId) : undefined,
      assigned_to: data.assignedTo
        ? BigInt(data.assignedTo)
        : undefined,
      is_done: data.status === "completed",
    },
  });
};