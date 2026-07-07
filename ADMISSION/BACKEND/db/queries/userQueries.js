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

export const updatePassword = async (userId, password_hash) => {
  return await prisma.app_user.update({
    where: {
      id: BigInt(userId)
    },
    data: {
      password_hash,
      updated_at: new Date()
    },
    select: {
      id: true
    }
  });
};