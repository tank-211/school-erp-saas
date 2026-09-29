import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { getSchoolAccess } from "../utils/schoolAccess.js";
import { generateToken } from "../utils/jwt.js";
import prisma from '../prisma/index.js';
import AppError from "../utils/AppError.js";

// There is no self-registration: schools and their first admin are created
// by Super Admin (SUPER-ADMIN createSchool), and staff are added by the
// school's admin.

export const loginService = async (email, password) => {
  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  const passwordMatch = await comparePassword(
    password,
    user.password_hash
  );

  if (!passwordMatch) {
    throw new Error("Invalid credentials");
  }

  // Checked after the password so an account's state is only revealed to its owner
  if (user.status !== "active") {
    throw new Error("Account deactivated. Contact administrator.");
  }

  // Suspended or expired schools cannot log in
  const access = await getSchoolAccess(user.school_id);
  if (!access.allowed) {
    const error = new Error(access.message);
    error.status = 403;
    error.code = access.code;
    throw error;
  }

  const token = generateToken({userId: Number(user.id),schoolId: Number(user.school_id), role: user.role});

  console.log("LOGIN RESULT:", {
    user: user.email,
    token: token ? "EXISTS" : "MISSING",
  });

  return {
    user: {
      id: Number(user.id),
      schoolId: Number(user.school_id),
      name: user.name,
      email: user.email,
      role: user.role,
    },
    token,
  };
};

export const getCurrentUserService = async (userId) => {
  const user = await prisma.user.findFirst({
    where: { id: BigInt(userId) },
    select: {
      id: true,
      school_id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      created_at: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return {
    id: Number(user.id),
    schoolId: Number(user.school_id),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    createdAt: user.created_at,
  };
};

export const updateProfileService = async (userId, data) => {
  const updatedUser = await prisma.user.update({
    where: { id: BigInt(userId) },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.email && { email: data.email }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
    },
  });

  return { ...updatedUser, id: Number(updatedUser.id) };
};

export const changePasswordService = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findFirst({
    where: { id: BigInt(userId) },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const passwordMatch = await comparePassword(currentPassword, user.password_hash);
  if (!passwordMatch) {
    throw new Error("Current password is incorrect");
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: BigInt(userId) },
    data: { password_hash : hashedPassword },
  });

  return { message: "Password changed successfully" };
};
