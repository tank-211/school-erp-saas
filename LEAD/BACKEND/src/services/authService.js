import { hashPassword, comparePassword } from "../utils/bcrypt.js";
import { generateToken } from "../utils/jwt.js";
import prisma from '../prisma/index.js';
console.log("🔥 AUTH SERVICE FILE LOADED 🔥");
console.log("prisma.user =", prisma.user);
console.log("prisma.app_user =", prisma.app_user);
console.log(Object.keys(prisma));
console.log("prisma.user =", prisma.user);
console.log("prisma.app_user =", prisma.app_user);
export const registerService = async (data) => {
  const existingUser = await prisma.user.findFirst({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new Error("Email already registered");
  }

  const hashedPassword = await hashPassword(data.password);

  // 🔥 STEP 1: normalize input
  const schoolName = data.schoolName.trim().toLowerCase();

  // 🔥 STEP 2: check if school already exists
  let school = await prisma.school.findFirst({
    where: {
      name: schoolName,
    },
  });

  // 🔥 STEP 3: create only if not exists
  if (!school) {
    school = await prisma.school.create({
      data: {
        name: schoolName,
      },
    });
  }
  
  console.log({
    name: data.name,
    email: data.email,
    password_hash: hashedPassword,
    school_id: school.id,
    role: "counselor",
    status: "active",
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
  console.log("USER CREATED:", user);
  
  console.log("BEFORE TOKEN");
  const token = generateToken({userId: Number(user.id),schoolId: Number(user.school_id), role: user.role,});
  console.log("AFTER TOKEN");
  console.log("BEFORE RETURN");
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
  console.log("LOGIN EMAIL:", email);
  const user = await prisma.user.findFirst({
    where: { email },
  });
  console.log("FOUND USER:", user);

  if (!user) {
    throw new Error("Invalid credentials");
  }

  if (user.status !== "active") {
    throw new Error("Account deactivated. Contact administrator.");
  }
    
  console.log("INPUT PASSWORD:", password);
  console.log("DB HASH:", user.password_hash);

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
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found");
  }

  return user;
};

export const updateProfileService = async (userId, data) => {
  const updatedUser = await prisma.user.update({
    where: { id: userId },
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

  return updatedUser;
};

export const changePasswordService = async (userId, currentPassword, newPassword) => {
  const user = await prisma.user.findFirst({
    where: { id: userId },
  });

  if (!user) {
    throw new Error("User not found");
  }

  const passwordMatch = await comparePassword(currentPassword, user.password); console.log("PASSWORD MATCH:", passwordMatch);
  if (!passwordMatch) {
    throw new Error("Current password is incorrect");
  }

  const hashedPassword = await hashPassword(newPassword);

  await prisma.user.update({
    where: { id: userId },
    data: { password_hash : hashedPassword },
  });

  return { message: "Password changed successfully" };
};
