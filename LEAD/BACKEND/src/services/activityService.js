import prisma from "../prisma/index.js";
import AppError from "../utils/AppError.js";

// lead_activity columns: lead_id, activity_type, notes, outcome,
// next_follow_up_date, scheduled_time, created_by, created_at, updated_at.
// A lead_activity has no school_id: it belongs to the school of its lead, so
// every query below filters through lead.school_id.

const isId = (value) => /^\d+$/.test(String(value ?? ""));

const activitySelect = {
  id: true,
  lead_id: true,
  activity_type: true,
  notes: true,
  outcome: true,
  next_follow_up_date: true,
  created_at: true,
  lead: { select: { id: true, first_name: true, last_name: true } },
  app_user: { select: { id: true, name: true } },
};

const findOwnedActivity = async (id, schoolId) => {
  if (!isId(id)) throw new AppError("Invalid activity id", 400);
  const activity = await prisma.activity.findFirst({
    where: { id: BigInt(id), lead: { school_id: BigInt(schoolId) } },
    select: { id: true },
  });
  if (!activity) throw new AppError("Activity not found", 404);
  return activity;
};

export const createActivityService = async (data, userId, schoolId) => {
  if (!isId(data.leadId)) throw new AppError("Lead ID is required", 400);

  const lead = await prisma.lead.findFirst({
    where: { id: BigInt(data.leadId), school_id: BigInt(schoolId) },
    select: { id: true },
  });
  if (!lead) throw new AppError("Lead not found", 404);

  return prisma.activity.create({
    data: {
      lead_id: lead.id,
      activity_type: String(data.type).slice(0, 50),
      notes: data.note || null,
      created_by: BigInt(userId),
    },
    select: activitySelect,
  });
};

export const getActivitiesByLeadService = async (leadId, schoolId, filters = {}) => {
  if (!isId(leadId)) throw new AppError("leadId is required", 400);

  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
  const where = {
    lead_id: BigInt(leadId),
    lead: { school_id: BigInt(schoolId) },
    ...(filters.type && { activity_type: filters.type }),
  };

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      select: activitySelect,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.activity.count({ where }),
  ]);

  return { activities, pagination: { total, page, limit } };
};

export const updateActivityService = async (id, data, schoolId) => {
  const activity = await findOwnedActivity(id, schoolId);
  return prisma.activity.update({
    where: { id: activity.id },
    data: {
      ...(data.type && { activity_type: String(data.type).slice(0, 50) }),
      ...(data.note !== undefined && { notes: data.note }),
      updated_at: new Date(),
    },
    select: activitySelect,
  });
};

export const deleteActivityService = async (id, schoolId) => {
  const activity = await findOwnedActivity(id, schoolId);
  await prisma.activity.delete({ where: { id: activity.id } });
  return { message: "Activity deleted successfully" };
};

export const getRecentActivitiesService = async (schoolId, limit = 10) => {
  const take = Math.min(Math.max(Number(limit) || 10, 1), 100);
  return prisma.activity.findMany({
    where: { lead: { school_id: BigInt(schoolId) } },
    select: activitySelect,
    orderBy: { created_at: "desc" },
    take,
  });
};
