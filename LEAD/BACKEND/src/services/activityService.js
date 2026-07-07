import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const createActivityService = async (data, userId) => {
  const activity = await prisma.activity.create({
    data: {
      type: data.type,
      note: data.note || null,
      leadId: data.leadId,
      userId,
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return activity;
};

export const getActivitiesByLeadService = async (leadId, filters = {}) => {
  const where = { leadId };

  if (filters.type) {
    where.type = filters.type;
  }

  const activities = await prisma.activity.findMany({
    where,
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
      lead: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    skip: (filters.page - 1) * filters.limit || 0,
    take: filters.limit || 20,
  });

  const total = await prisma.activity.count({ where });

  return {
    activities,
    pagination: {
      total,
      page: filters.page || 1,
      limit: filters.limit || 20,
    },
  };
};

export const updateActivityService = async (id, data) => {
  const activity = await prisma.activity.update({
    where: { id },
    data: {
      ...(data.type && { type: data.type }),
      ...(data.note !== undefined && { note: data.note }),
    },
    include: {
      user: {
        select: { id: true, name: true, email: true },
      },
    },
  });

  return activity;
};

export const deleteActivityService = async (id) => {
  await prisma.activity.delete({
    where: { id },
  });

  return { message: "Activity deleted successfully" };
};

export const getRecentActivitiesService = async (limit = 10) => {
  const activities = await prisma.activity.findMany({
    include: {
      user: {
        select: { id: true, name: true },
      },
      lead: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return activities;
};
