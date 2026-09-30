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

export const updateUserRoleService = async (
  userId,
  role,
  schoolId
) => {
  return await prisma.user.updateMany({
    where: {
      id: BigInt(userId),
      school_id: BigInt(schoolId)
    },
    data: {
      role
    }
  });
};
export const toggleUserStatusService = async (
  userId,
  schoolId
) => {

  const user = await prisma.user.findFirst({
    where: {
      id: BigInt(userId),
      school_id: BigInt(schoolId)
    }
  })

  if (!user) {
    throw new Error("User not found")
  }

  return await prisma.user.update({
    where: {
      id: BigInt(userId),
    },
    data: {
      status: user.status === "active" ? "inactive" : "active"
    }
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