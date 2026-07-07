import prisma from "../prisma/index.js";

// 🔥 GET ALL NOTIFICATIONS
export const getNotifications = async (req, res) => {
  try {
    console.log("REQ.USER:", req.user);

    const notifications = await prisma.notification.findMany({
      where: {
          userId: req.user.id
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("NOTIFICATION ERROR:", error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔥 GET UNREAD COUNT
export const getUnreadCount = async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: {
        isRead: false,
        userId: req.user.id
      }
    });

    res.json({
      success: true,
      data: count,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 🔥 MARK AS READ
export const markAsRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({
      where: {
        id: parseInt(req.params.id),
        userId: req.user.id
      },
      data: {
        isRead: true,
      },
    });

    res.json({
      success: true,
      message: "Marked as read",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};