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

// Throws a 400-style error unless the assignee (and lead, when given) belong to
// the given school. Used by create and update so tasks can't point elsewhere.
const assertTaskRefsInSchool = async (data, schoolId, { requireAssignee }) => {
  const sid = BigInt(schoolId);
  const isId = (v) => /^\d+$/.test(String(v ?? ""));

  if (requireAssignee || data.assignedTo) {
    if (!isId(data.assignedTo)) {
      const e = new Error("Valid assignedTo user is required"); e.statusCode = 400; throw e;
    }
    const user = await prisma.user.findFirst({
      where: { id: BigInt(data.assignedTo), school_id: sid },
      select: { id: true },
    });
    if (!user) { const e = new Error("Assigned user not found in this school"); e.statusCode = 400; throw e; }
  }

  if (data.leadId) {
    if (!isId(data.leadId)) { const e = new Error("Invalid leadId"); e.statusCode = 400; throw e; }
    const lead = await prisma.lead.findFirst({
      where: { id: BigInt(data.leadId), school_id: sid },
      select: { id: true },
    });
    if (!lead) { const e = new Error("Lead not found in this school"); e.statusCode = 400; throw e; }
  }
};

export const createTaskService = async (data, schoolId) => {
  await assertTaskRefsInSchool(data, schoolId, { requireAssignee: true });

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

export const updateTaskService = async (id, data, schoolId) => {
  await assertTaskRefsInSchool(data, schoolId, { requireAssignee: false });

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