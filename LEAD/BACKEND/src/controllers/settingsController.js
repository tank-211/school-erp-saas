import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// 🔥 SINGLE SOURCE OF TRUTH
const DEFAULT_SETTINGS = {
  schoolName: "My School",
  email: "admin@example.com",
  phone: "",

  emailNotifications: true,
  smsNotifications: false,

  newLead: true,
  task: true,
  app: true,
  whatsapp: false,
  weekly: true,

  timezone: "Asia/Kolkata",
  language: "English",
  twoFactorEnabled: false,
};

// ---------------- GET SETTINGS ----------------
export const getSettings = async (req, res) => {
  try {
    const settings = await prisma.settings.upsert({
      where: { schoolId: req.user.schoolId },
      update: {},
      create: { schoolId: req.user.schoolId, ...DEFAULT_SETTINGS },
    });

    res.json({ success: true, data: settings });
  } catch (err) {
      console.error("GET SETTINGS ERROR");
      console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ---------------- UPDATE PROFILE ----------------
export const updateProfile = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      });
    }
    const { schoolName, email, phone } = req.body;

    if (!schoolName || !email) {
      return res.status(400).json({
        success: false,
        message: "schoolName and email are required",
      });
    }

    const updated = await prisma.settings.upsert({
      where: { schoolId: req.user.schoolId },
      update: { schoolName, email, phone },
      create: {
        schoolId: req.user.schoolId,
        ...DEFAULT_SETTINGS,
        schoolName,
        email,
        phone,
      },
    });

    await prisma.settingsLog.create({
      data: {
        userId: req.user.id,
        schoolId: req.user.schoolId,
        action: "UPDATE_SETTINGS",
        changes: req.body
      }
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ---------------- UPDATE NOTIFICATIONS ----------------
export const updateNotifications = async (req, res) => {
  try {
    console.log("🔥 updateNotifications HIT", req.body);

    const updated = await prisma.settings.upsert({
      where: { schoolId: req.user.schoolId },
      update: {
        emailNotifications: req.body.emailNotifications,
        smsNotifications: req.body.smsNotifications,
        newLead: req.body.newLead,
        task: req.body.task,
        app: req.body.app,
        whatsapp: req.body.whatsapp,
        weekly: req.body.weekly,
      },
      create: {
        schoolId: req.user.schoolId,
        ...DEFAULT_SETTINGS,
        emailNotifications: req.body.emailNotifications,
        smsNotifications: req.body.smsNotifications,
        newLead: req.body.newLead,
        task: req.body.task,
        app: req.body.app,
        whatsapp: req.body.whatsapp,
        weekly: req.body.weekly,
      },
    });

    console.log("🔥 BEFORE LOG INSERT");

    await prisma.settingsLog.create({
      data: {
        userId: req.user.id,
        schoolId: req.user.schoolId,
        action: "UPDATE_NOTIFICATIONS",
        changes: req.body
      }
    });

    console.log("✅ LOG SAVED");

    res.json({ success: true, data: updated });

  } catch (err) {
    console.error("❌ ERROR:", err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ---------------- UPDATE SYSTEM ----------------
export const updateSystem = async (req, res) => {
  try {
    console.log("🔥 updateSystem HIT", req.body);
        if (req.user.role !== "admin") {
          return res.status(403).json({
            success: false,
            message: "Access denied"
          });
        }
    const { timezone, language, campus, dateFormat } = req.body;

    const updated = await prisma.settings.upsert({
      where: { schoolId: req.user.schoolId },
      update: { timezone, language, campus, dateFormat },
      create: {
        schoolId: req.user.schoolId,
        ...DEFAULT_SETTINGS,
        timezone,
        language,
        campus,
        dateFormat
      },
    });

      await prisma.settingsLog.create({
        data: {
          userId: req.user.id,
          schoolId: req.user.schoolId,
          action: "UPDATE_SYSTEM",
          changes: req.body
        }
      });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ---------------- CHANGE PASSWORD ----------------
export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Both passwords required",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters",
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
    });

    if (!user) {
      return res.status(500).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Wrong password",
      });
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id: req.user.id },
      data: { password: hashed },
    });

    res.json({ success: true, message: "Password updated" });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ---------------- TOGGLE 2FA ----------------
export const toggle2FA = async (req, res) => {
  try {
    const { enabled } = req.body;

    const value = enabled === true || enabled === "true";

    const updated = await prisma.settings.upsert({
      where: { schoolId: req.user.schoolId },
      update: {
        twoFactorEnabled: value,
      },
      create: {
        schoolId: req.user.schoolId,
        ...DEFAULT_SETTINGS,
        twoFactorEnabled: value,
      },
    });

    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

export const getSettingsLogs = async (req, res) => {
  try {
    const logs = await prisma.settingsLog.findMany({
      where: { schoolId: req.user.schoolId },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};