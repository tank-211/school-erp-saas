import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { generateToken } from "../utils/jwt.js";
import prisma from '../prisma/index.js';
import AppError from "../utils/AppError.js";

export const registerService = async (data) => {
  const existingUser = await prisma.user.findFirst({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await hashPassword(data.password);

  // Normalize input
  const schoolName = data.schoolName.trim().toLowerCase();

  // Self-registration may only create a NEW school. Joining an existing school
  // is not allowed here: it let anyone who knew a school's name become a user
  // of that school and read its data. Staff of an existing school are added by
  // that school's admin (user invite) or by Super Admin.
  const existingSchool = await prisma.school.findFirst({
    where: {
      name: { equals: schoolName, mode: "insensitive" },
    },
    select: { id: true },
  });

  if (existingSchool) {
    throw new AppError(
      "A school with this name is already registered. Ask your school admin to add you.",
      409
    );
  }

  const school = await prisma.school.create({
    data: {
      name: schoolName,
    },
  });

  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      password_hash: hashedPassword,
      school_id: school.id, // 🔥 THIS IS THE FIX
      role: "counselor",
      status: "active",
    },
  });
  const token = generateToken({userId: Number(user.id),schoolId: Number(user.school_id), role: user.role,});
  return {
    user: {
          id: Number(user.id),
          schoolID: Number(user.school_id),
          name: user.name,
          email: user.email,
          role: user.role,
        },
        token,
      };
    };

export const loginService = async (email, password) => {
  const user = await prisma.user.findFirst({
    where: { email },
  });

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (user.status !== "active") {
    throw new Error("Account deactivated. Contact administrator.");
  }
    
  const passwordMatch = await comparePassword(
    password,
    user.password_hash
  );

  if (!passwordMatch) {
    throw new Error("Invalid credentials");
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
