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
    // Start from the school's real details, not placeholders
    const school = await prisma.school.findUnique({
      where: { id: BigInt(req.user.schoolId) },
      select: { name: true, email: true, phone: true, city: true },
    });
    const real = {
      schoolName: school?.name || DEFAULT_SETTINGS.schoolName,
      email: school?.email || "",
      phone: school?.phone || "",
    };

    const settings = await prisma.settings.upsert({
      where: { schoolId: req.user.schoolId },
      update: {},
      create: { schoolId: req.user.schoolId, ...DEFAULT_SETTINGS, ...real, campus: school?.city || null },
    });

    // Rows created earlier hold the old placeholders: show the real values instead
    // The school's name and city always come from the school record (set by
    // Super Admin), so every module shows the same school
    const shown = {
      ...settings,
      schoolName: real.schoolName,
      campus: school?.city || null,
      city: school?.city || null,
      email: real.email || (settings.email === DEFAULT_SETTINGS.email ? "" : settings.email),
      phone: real.phone || settings.phone || "",
    };

    res.json({ success: true, data: shown });
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
    // The school name is set by Super Admin; the school's contact details are
    // saved on the school record, which Admission and Fees also use
    const email = String(req.body.email || "").trim();
    const phone = String(req.body.phone || "").trim();

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "A valid contact email is required",
      });
    }
    if (phone.length > 20) {
      return res.status(400).json({ success: false, message: "Phone must be 20 characters or fewer" });
    }

    let school;
    try {
      school = await prisma.school.update({
        where: { id: BigInt(req.user.schoolId) },
        data: { email, phone: phone || null, updated_at: new Date() },
        select: { name: true, city: true, email: true, phone: true },
      });
    } catch (e) {
      if (e.code === "P2002") {
        return res.status(409).json({ success: false, message: "Another school already uses this contact email" });
      }
      throw e;
    }

    const saved = await prisma.settings.upsert({
      where: { schoolId: req.user.schoolId },
      update: { schoolName: school.name, email, phone },
      create: {
        schoolId: req.user.schoolId,
        ...DEFAULT_SETTINGS,
        schoolName: school.name,
        email,
        phone,
      },
    });
    const updated = { ...saved, schoolName: school.name, campus: school.city, city: school.city };

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