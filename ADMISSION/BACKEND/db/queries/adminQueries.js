import prisma from '../../src/lib/prisma.js';

export const getUsersBySchoolId = async (schoolId) => {
  return await prisma.app_user.findMany({
    where: {
      school_id: BigInt(schoolId)
    },
    select: {
      id: true,
      school_id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      created_at: true
    },
    orderBy: {
      created_at: 'desc'
    }
  });
};

export const updatePassword = async (userId, schoolId, password_hash) => {
  return await prisma.app_user.updateMany({
    where: {
      id: BigInt(userId),
      school_id: BigInt(schoolId)
    },
    data: {
      password_hash,
      updated_at: new Date()
    }
  });
};

export const deleteUser = async (userId, schoolId) => {
  const user = await prisma.app_user.findFirst({
    where: {
      id: BigInt(userId),
      school_id: BigInt(schoolId)
    },
    select: {
      id: true
    }
  });

  if (!user) return null;

  await prisma.app_user.delete({
    where: {
      id: BigInt(userId)
    }
  });

  return user;
};