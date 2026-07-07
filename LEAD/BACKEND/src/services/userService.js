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

export const inviteUserService = async (email, schoolId) => {
  const user = await prisma.user.create({
    data: {
      email,
      name: "Invited User",
      password_hash: await bcrypt.hash("temp123", 10),
      school_id,
      role: "user",
    },
  });

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    createdAt: user.createdAt,
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