/**
 * db/queries/authQueries.js
 * Database queries for authentication
 */

import prisma from '../../src/lib/prisma.js';

/**
 * getUserByEmail(email)
 * Fetch user by email
 */
export const getUserByEmail = async (email) => {
  return await prisma.app_user.findFirst({
    where: {
      email,
      status: 'active'
    }
  });
};

/**
 * getUserById(id)
 * Fetch user by ID
 */
export const getUserById = async (id) => {
  return await prisma.app_user.findUnique({
    where: {
      id: BigInt(id)
    }
  });
};

/**
 * createUser(data)
 * Create new user (for signup or admin creation)
 */
export const createUser = async (data) => {
  return await prisma.app_user.create({
    data: {
      school_id: BigInt(data.school_id),
      name: data.name,
      email: data.email,
      password_hash: data.password_hash,
      role: data.role || 'counselor',
      status: 'active'
    }
  });
};
