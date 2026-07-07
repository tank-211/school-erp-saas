import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getNotificationsService = async (userId) => {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10
  });
};

export const getUnreadCountService = async (userId) => {
  return prisma.notification.count({
    where: { userId, isRead: false }
  });
};

export const markAsReadService = async (id) => {
  return prisma.notification.update({
    where: { id },
    data: { isRead: true }
  });
};