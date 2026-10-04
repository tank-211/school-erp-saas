import crypto from "crypto";
import prisma from "../prisma/index.js";
import bcrypt from "bcrypt";

export const getAllUsersService = async (schoolId) => {
  const users = await prisma.user.findMany({
    where: { school_id:BigInt(schoolId) },
    select: {
      id: true,
      name: true,
      email: true,
      role: true, 
      status: true,
      created_at: true,
    },
  });

  return users;
};

const INVITE_ROLES = ["counselor", "admin", "accountant"];

// Creates a school user with a one-time random password (never a shared default).
export const inviteUserService = async ({ email, name, role }, schoolId) => {
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanName = String(name || "").trim();
  const cleanRole = String(role || "counselor").toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    const e = new Error("A valid email is required"); e.statusCode = 400; throw e;
  }
  if (!cleanName) {
    const e = new Error("Name is required"); e.statusCode = 400; throw e;
  }
  if (!INVITE_ROLES.includes(cleanRole)) {
    const e = new Error(`Role must be one of: ${INVITE_ROLES.join(", ")}`); e.statusCode = 400; throw e;
  }

  const existing = await prisma.user.findFirst({ where: { email: cleanEmail }, select: { id: true } });
  if (existing) {
    const e = new Error("A user with this email already exists"); e.statusCode = 409; throw e;
  }

  // 12 characters from an unambiguous alphabet, e.g. "k7Rp2mXq9TzB"
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = crypto.randomBytes(12);
  const temporaryPassword = Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");

  const user = await prisma.user.create({
    data: {
      email: cleanEmail,
      name: cleanName.slice(0, 150),
      password_hash: await bcrypt.hash(temporaryPassword, 10),
      school_id: BigInt(schoolId),
      role: cleanRole,
      status: "active",
    },
  });

  return {
    id: Number(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.created_at,
    // Shown once to the admin to pass on; the user should change it after signing in
    temporaryPassword,
  };
};

const fail = (message, statusCode) => {
  const e = new Error(message); e.statusCode = statusCode; throw e;
};

const safeUserSelect = { id: true, name: true, email: true, role: true, status: true };

const findSchoolUser = async (userId, schoolId) => {
  if (!/^\d+$/.test(String(userId ?? ""))) fail("User not found", 404);
  const user = await prisma.user.findFirst({
    where: { id: BigInt(userId), school_id: BigInt(schoolId) },
    select: safeUserSelect,
  });
  if (!user) fail("User not found", 404);
  return user;
};

// A school must always keep one active admin, or nobody could manage its users.
const assertNotLastActiveAdmin = async (user, schoolId, message) => {
  if (user.role !== "admin" || user.status !== "active") return;
  const otherAdmins = await prisma.user.count({
    where: { school_id: BigInt(schoolId), role: "admin", status: "active", id: { not: user.id } },
  });
  if (otherAdmins === 0) fail(message, 400);
};

export const updateUserRoleService = async (
  userId,
  role,
  schoolId
) => {
  const cleanRole = String(role || "").trim().toLowerCase();
  if (!INVITE_ROLES.includes(cleanRole)) {
    fail(`Role must be one of: ${INVITE_ROLES.join(", ")}`, 400);
  }

  const user = await findSchoolUser(userId, schoolId);
  if (cleanRole !== "admin") {
    await assertNotLastActiveAdmin(user, schoolId, "The school's last active admin cannot be given another role");
  }

  return await prisma.user.update({
    where: { id: user.id },
    data: { role: cleanRole },
    select: safeUserSelect,
  });
};
export const toggleUserStatusService = async (
  userId,
  schoolId,
  actorId
) => {
  const user = await findSchoolUser(userId, schoolId);

  if (user.status === "active") {
    if (String(user.id) === String(actorId)) {
      fail("You cannot deactivate your own account", 400);
    }
    await assertNotLastActiveAdmin(user, schoolId, "The school's last active admin cannot be deactivated");
  }

  return await prisma.user.update({
    where: { id: user.id },
    data: {
      status: user.status === "active" ? "inactive" : "active"
    },
    select: safeUserSelect,
  })
};

export const getCounselorsService = async (schoolId) => {
  return await prisma.user.findMany({
    where: {
      school_id: BigInt(schoolId),
      role: "counselor",
    },
    select: {
      id: true,
      name: true,
    },
    orderBy: {
      name: "asc",
    },
  });
};