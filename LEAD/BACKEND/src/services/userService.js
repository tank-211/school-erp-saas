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
  try {
    console.log("EMAIL:", email);
    console.log("SCHOOL:", schoolId);

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    console.log("EXISTING:", existing);

    const user = await prisma.user.create({
      data: {
        email,
        name: email.split("@")[0],
        password_hash: await bcrypt.hash("temp123", 10),
        school_id: BigInt(schoolId),
        role: "user",
      },
    });

    console.log("CREATED USER:", user);

    return {
      id: Number(user.id),
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.created_at,
    };
  } catch (err) {
    console.error("PRISMA ERROR:");
    console.error(err);
    throw err;
  }
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