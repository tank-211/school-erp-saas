const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { serializeBigInt } = require("../utils/bigintSerializer");

const allowedPlanTypes = new Set(['trial', 'basic', 'pro', 'ultimate']);

const normalizePlanType = (planType) => {
  if (planType === undefined || planType === null || planType === '') {
    return 'trial';
  }

  return String(planType).trim().toLowerCase();
};

// Default academic year for a new school: the Indian school year (1 April to
// 31 March) that contains today, e.g. "2026-27". A school needs an active year
// before it can add leads, so onboarding creates one; the school admin can add
// or switch years later in ADMISSION → School Setup.
const defaultAcademicYear = (today = new Date()) => {
  const year = today.getUTCMonth() >= 3 ? today.getUTCFullYear() : today.getUTCFullYear() - 1;
  return {
    year_name: `${year}-${String((year + 1) % 100).padStart(2, "0")}`,
    start_date: new Date(Date.UTC(year, 3, 1)),
    end_date: new Date(Date.UTC(year + 1, 2, 31)),
  };
};

// Trial length for new schools: one calendar month from today's India date
// (29 Sep -> 29 Oct; 31 Jan -> 28/29 Feb). The school stays usable through
// that day and is blocked from the next day (see utils/schoolAccess in the
// school apps).
const TRIAL_MONTHS = 1;
const trialEndDate = (now = new Date()) => {
  const [y, m, d] = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" })
    .format(now)
    .split("-")
    .map(Number);
  const targetMonth = m - 1 + TRIAL_MONTHS;
  const lastDay = new Date(Date.UTC(y, targetMonth + 1, 0)).getUTCDate();
  return new Date(Date.UTC(y, targetMonth, Math.min(d, lastDay)));
};

const isValidDateString = (value) =>
  /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) && !Number.isNaN(new Date(value).getTime());

// GET /api/super-admin/schools — Fetch all schools
const getAllSchools = async (req, res) => {
  try {
    const schools = await prisma.school.findMany({
      orderBy: {
        created_at: "desc",
      },
    });

    const today = new Date();

    const mappedSchools = schools.map((school) => {
      const expiry = school.expiry_date;

      return {
        ...school,
        is_expired: expiry ? expiry < today : false,
        is_expiring_soon: expiry
          ? expiry >= today &&
            expiry <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
          : false,
      };
    });

    return res.json(
      serializeBigInt({
        schools: mappedSchools,
      })
    );
  } catch (err) {
    console.error('Get schools error:', err);
    return res.status(500).json({ error: 'Failed to fetch schools.' });
  }
};

// GET /api/super-admin/stats — Dashboard summary metrics
const getStats = async (req, res) => {
  console.log(">>> getStats() called");
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);

    console.log("1");
    const totalSchools = await prisma.school.count();

    console.log("2");
    const activeSchools = await prisma.school.count({
      where: {
        is_active: true,
      },
    });

    console.log("3");
    const suspendedSchools = await prisma.school.count({
      where: {
        status: "suspended",
      },
    });

    console.log("4");
    const expiredSchools = await prisma.school.count({
      where: {
        expiry_date: {
          lt: today,
        },
      },
    });

    console.log("5");
    const expiringSoonSchools = await prisma.school.count({
      where: {
        expiry_date: {
          gte: today,
          lte: thirtyDaysLater,
        },
      },
    });

    console.log("6");
    const totalActiveStudents = await prisma.student.count({
      where: {
        status: "active",
      },
    });

    console.log("7");
    const expiringSchools = await prisma.school.findMany({
      where: {
        expiry_date: {
          gte: today,
          lte: thirtyDaysLater,
        },
      },
      select: {
        id: true,
        name: true,
        plan_type: true,
        is_active: true,
        expiry_date: true,
      },
      orderBy: {
        expiry_date: "asc",
      },
    });

    console.log("8");
    const schoolUsers = await prisma.app_user.groupBy({
      by: ["school_id"],
      _count: {
        id: true,
      },
      orderBy: {
        school_id: "asc",
      },
    });

    console.log("9");

      return res.json(
    serializeBigInt({
      stats: {
        total_schools: totalSchools,
        active_schools: activeSchools,
        suspended_schools: suspendedSchools,
        expired_schools: expiredSchools,
        expiring_soon_schools: expiringSoonSchools,
        total_active_students: totalActiveStudents,
      },

      expiring_schools: expiringSchools,

      school_user_counts: schoolUsers.map((item) => ({
        school_id: item.school_id,
        total_users: item._count.id,
      })),
    })
  );
  } catch (err) {
    console.error("========== GET STATS ERROR ==========");
    console.error(err);
    console.error("Message:", err.message);
    console.error("Stack:", err.stack);

    return res.status(500).json({
      error: err.message,
    });
  }
};

// POST /api/super-admin/schools — Create school + provision first admin
// POST /api/super-admin/schools — Create school + provision first admin
const createSchool = async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      address,
      city,
      state,
      postal_code,
      country,
      principal_name,
      plan_type,
      expiry_date,
      admin_name,
      admin_email,
      admin_password,
    } = req.body;

    const normalizedPlanType = normalizePlanType(plan_type);

    if (!allowedPlanTypes.has(normalizedPlanType)) {
      return res.status(400).json({
        error: "Invalid plan type.",
      });
    }

    if (!name || !admin_name || !admin_email || !admin_password) {
      return res.status(400).json({
        error:
          "School name, admin name, admin email, and admin password are required.",
      });
    }

    // The school apps' logins require at least 8 characters (LEAD rejects less)
    if (String(admin_password).length < 8) {
      return res.status(400).json({ error: "Admin password must be at least 8 characters." });
    }

    const adminEmail = String(admin_email).trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      return res.status(400).json({ error: "Admin email is not valid." });
    }

    // Trial: always one month. Paid plans: an explicit end date is required, so
    // no school gets unlimited access by accident; renewals extend it later.
    let schoolExpiry;
    if (normalizedPlanType === "trial") {
      schoolExpiry = trialEndDate();
    } else {
      if (!isValidDateString(expiry_date)) {
        return res.status(400).json({ error: "Expiry date (YYYY-MM-DD) is required for paid plans." });
      }
      schoolExpiry = new Date(expiry_date);
    }

    // The school apps find users by email alone at login, so an email may
    // belong to only one account across all schools.
    const emailTaken = await prisma.app_user.findFirst({
      where: { email: { equals: adminEmail, mode: "insensitive" } },
      select: { id: true },
    });
    if (emailTaken) {
      return res.status(409).json({ error: "This admin email is already used by another account." });
    }

    const hashedPassword = await bcrypt.hash(admin_password, 10);

    const result = await prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name,
          email,
          phone,
          address,
          city,
          state,
          postal_code,
          country,
          principal_name,
          plan_type: normalizedPlanType,
          is_active: true,
          expiry_date: schoolExpiry,
          trial_end_date: normalizedPlanType === "trial" ? schoolExpiry : null,
          status: "active",
          created_by: req.staffUser.full_name,
        },
        select: {
          id: true,
          name: true,
          plan_type: true,
          expiry_date: true,
        },
      });

      const admin = await tx.app_user.create({
        data: {
          school_id: school.id,
          name: admin_name,
          email: adminEmail,
          password_hash: hashedPassword,
          role: "admin",
          status: "active",
          created_by: req.staffUser.full_name,
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });

      const firstYear = defaultAcademicYear();
      const academicYear = await tx.academic_year.create({
        data: {
          school_id: school.id,
          year_name: firstYear.year_name,
          start_date: firstYear.start_date,
          end_date: firstYear.end_date,
          is_active: true,
          status: "active",
          created_by: req.staffUser.full_name,
        },
        select: {
          id: true,
          year_name: true,
        },
      });

      return { school, admin, academicYear };
    });

    return res.status(201).json(
      serializeBigInt({
        message: "School created with its admin and first academic year.",
        school: result.school,
        admin: result.admin,
        academic_year: result.academicYear,
      })
    );
  } catch (err) {
    console.error("Create school error:", err);

    if (err.code === "P2002") {
      return res.status(409).json({
        error: "School name or admin email already exists.",
      });
    }

    return res.status(500).json({
      error: "Failed to create school.",
    });
  }
};

// PATCH /api/super-admin/schools/:id — Update school status/expiry
// PATCH /api/super-admin/schools/:id — Update school status/expiry
const updateSchool = async (req, res) => {
  try {
    const { id } = req.params;
    const { is_active, expiry_date, plan_type, status } = req.body;

    const normalizedPlanType =
      plan_type === undefined ? undefined : normalizePlanType(plan_type);

    if (
      normalizedPlanType !== undefined &&
      !allowedPlanTypes.has(normalizedPlanType)
    ) {
      return res.status(400).json({ error: "Invalid plan type." });
    }

    let nextStatus = status;
    let nextIsActive = is_active;

    if (nextStatus === "active") {
      nextIsActive = true;
    } else if (
      nextStatus === "suspended" ||
      nextStatus === "inactive"
    ) {
      nextIsActive = false;
      nextStatus = "suspended";
    }

    if (nextIsActive !== undefined) {
      nextStatus = nextIsActive ? "active" : (nextStatus || "suspended");

      if (!nextIsActive) {
        nextStatus = "suspended";
      }
    }

    const data = {};

    if (nextIsActive !== undefined) {
      data.is_active = nextIsActive;
    }

    if (expiry_date !== undefined) {
      data.expiry_date = expiry_date ? new Date(expiry_date) : null;
    }

    if (normalizedPlanType !== undefined) {
      data.plan_type = normalizedPlanType;
    }

    if (nextStatus !== undefined) {
      data.status = nextStatus;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        error: "No fields to update.",
      });
    }

    data.updated_at = new Date();
    data.updated_by = req.staffUser.full_name;

    const school = await prisma.school.update({
      where: {
        id: BigInt(id),
      },
      data,
      select: {
        id: true,
        name: true,
        is_active: true,
        expiry_date: true,
        plan_type: true,
        status: true,
      },
    });

    return res.json(
      serializeBigInt({
        message: "School updated successfully.",
        school,
      })
    );
  } catch (err) {
    console.error("Update school error:", err);

    if (err.code === "P2025") {
      return res.status(404).json({
        error: "School not found.",
      });
    }

    return res.status(500).json({
      error: "Failed to update school.",
    });
  }
};

module.exports = { getAllSchools, getStats, createSchool, updateSchool, defaultAcademicYear, trialEndDate };
