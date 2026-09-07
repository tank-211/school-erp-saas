const bcrypt = require('bcryptjs');

import prisma from '../config/database';
import { getDBStatus } from '../config/database';
import { generateTokenPair, verifyRefreshToken, } from '../config/jwt';
import {
  ConflictError,
  NotFoundError,
  AuthenticationError,
} from '../middleware/errorHandler';
import { mockUsers } from './mockDataService';
import logger from '../config/logger';

type UserRole = string;

export class AuthService {
  async register(
    firstName: string,
    lastName: string,
    email: string,
    phone: string,
    password: string,
    role: UserRole = 'counselor',
    schoolId: string
  ) {
    try {
      if (!schoolId) {
        throw new Error('schoolId is required for registration');
      }

      const name = `${firstName || ''} ${lastName || ''}`.trim();

      // Verify school exists
      const school = await prisma.school.findUnique({
        where: {
          id: BigInt(schoolId),
        },
      });

      if (!school) {
        throw new NotFoundError('School not found');
      }

      // Check whether email is already registered
      const existingUser = await prisma.app_user.findFirst({
        where: {
          email,
        },
      });

      if (existingUser) {
        throw new ConflictError('Email already registered');
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const user = await prisma.app_user.create({
        data: {
          school_id: BigInt(schoolId),
          name,
          email,
          password_hash: hashedPassword,
          role,
          status: 'active',
        },
      });

      const tokens = generateTokenPair({
        id: user.id.toString(),
        email: user.email,
        role: user.role,
        schoolId: user.school_id.toString(),
      });

      return {
        user: {
          id: user.id.toString(),
          firstName: firstName || '',
          lastName: lastName || '',
          email: user.email,
          role: user.role,
          status: user.status,
          schoolId: user.school_id.toString(),
        },
        ...tokens,
      };
    } catch (error: any) {
      // Development fallback when database is unavailable
      if (
        !getDBStatus() &&
        process.env.NODE_ENV === 'development'
      ) {
        logger.warn(
          '📦 Using mock data for user registration (database unavailable)'
        );

        const hashedPassword = await bcrypt.hash(password, 10);

        const mockUser = {
          id: Date.now().toString(),
          name: `${firstName || ''} ${lastName || ''}`.trim(),
          email,
          password: hashedPassword,
          role,
          schoolId: schoolId || '1',
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        const tokens = generateTokenPair({
          id: mockUser.id,
          email: mockUser.email,
          role: mockUser.role,
          schoolId: mockUser.schoolId,
        });

        return {
          user: {
            id: mockUser.id,
            firstName: firstName || '',
            lastName: lastName || '',
            email: mockUser.email,
            role: mockUser.role,
            schoolId: mockUser.schoolId,
          },
          ...tokens,
        };
      }

      throw error;
    }
  }

  async login(email: string, password: string) {
    try {
      const user = await prisma.app_user.findUnique({
        where: {
          email,
        },
      });

      if (!user) {
        throw new AuthenticationError(
          'Invalid email or password'
        );
      }

      if (user.status !== 'active') {
        throw new AuthenticationError(
          'User account is inactive'
        );
      }

      const passwordMatch = await bcrypt.compare(
        password,
        user.password_hash
      );

      if (!passwordMatch) {
        throw new AuthenticationError(
          'Invalid email or password'
        );
      }

      const tokens = generateTokenPair({
        id: user.id.toString(),
        email: user.email,
        role: user.role,
        schoolId: user.school_id.toString(),
      });

      const nameParts = user.name
        .trim()
        .split(/\s+/);

      const firstName = nameParts[0] || '';

      const lastName =
        nameParts.slice(1).join(' ') || '';

      return {
        user: {
          id: user.id.toString(),
          firstName,
          lastName,
          email: user.email,
          role: user.role,
          status: user.status,
          schoolId: user.school_id.toString(),
        },
        ...tokens,
      };
    } catch (error: any) {
      // Development fallback when database is unavailable
      if (
        !getDBStatus() &&
        process.env.NODE_ENV === 'development'
      ) {
        logger.warn(
          '📦 Using mock data for login (database unavailable)'
        );

        const mockUser = mockUsers.find(
          (u) => u.email === email
        );

        if (!mockUser) {
          throw new AuthenticationError(
            'Invalid email or password'
          );
        }

        const passwordMatch = await bcrypt.compare(
          password,
          mockUser.password
        );

        if (!passwordMatch) {
          throw new AuthenticationError(
            'Invalid email or password'
          );
        }

        const tokens = generateTokenPair({
          id: mockUser.id.toString(),
          email: mockUser.email,
          role: String(mockUser.role),
          schoolId: String(
            (mockUser as any).schoolId ??
              (mockUser as any).school_id ??
              '1'
          ),
        });

        const nameParts = mockUser.name
          .trim()
          .split(/\s+/);

        return {
          user: {
            id: mockUser.id.toString(),
            firstName: nameParts[0] || '',
            lastName:
              nameParts.slice(1).join(' ') || '',
            email: mockUser.email,
            role: mockUser.role,
          },
          ...tokens,
        };
      }

      throw error;
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      const payload = verifyRefreshToken(refreshToken);

      const user = await prisma.app_user.findUnique({
        where: {
          id: BigInt(payload.id),
        },
      });

      if (!user) {
        throw new AuthenticationError('User not found');
      }

      if (user.status !== 'active') {
        throw new AuthenticationError('User account is inactive');
      }

      const tokens = generateTokenPair({
        id: user.id.toString(),
        email: user.email,
        role: user.role,
        schoolId: user.school_id.toString(),
      });

      return tokens;
    } catch (error) {
      if (error instanceof AuthenticationError) {
        throw error;
      }

      throw new AuthenticationError(
        'Invalid or expired refresh token'
      );
    }
  }

  async getUserById(id: string, schoolId: string) {
    const user = await prisma.app_user.findFirst({
      where: { id: BigInt(id), school_id: BigInt(schoolId) },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        school_id: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const nameParts = user.name
      .trim()
      .split(/\s+/);

    return {
      id: user.id.toString(),
      firstName: nameParts[0] || '',
      lastName:
        nameParts.slice(1).join(' ') || '',
      email: user.email,
      role: user.role,
      status: user.status,
      schoolId: user.school_id.toString(),
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }

  async updateUser(
    id: string,
    schoolId: string,
    data: {
      firstName?: string;
      lastName?: string;
      phone?: string;
    }
  ) {
    const currentUser =
      await prisma.app_user.findFirst({
        where: { id: BigInt(id), school_id: BigInt(schoolId) },
      });

    if (!currentUser) {
      throw new NotFoundError('User not found');
    }

    const updateData: {
      name?: string;
    } = {};

    if (
      data.firstName !== undefined ||
      data.lastName !== undefined
    ) {
      const currentNameParts = currentUser.name
        .trim()
        .split(/\s+/);

      const firstName =
        data.firstName ??
        currentNameParts[0] ??
        '';

      const lastName =
        data.lastName ??
        currentNameParts.slice(1).join(' ');

      updateData.name =
        `${firstName} ${lastName}`.trim();
    }

    const user = await prisma.app_user.update({
      where: {
        id: BigInt(id),
      },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        school_id: true,
      },
    });

    const nameParts = user.name
      .trim()
      .split(/\s+/);

    return {
      id: user.id.toString(),
      firstName: nameParts[0] || '',
      lastName:
        nameParts.slice(1).join(' ') || '',
      email: user.email,
      role: user.role,
      status: user.status,
      schoolId: user.school_id.toString(),
    };
  }

  async listUsers(
    page: number = 1,
    limit: number = 10,
    role?: UserRole,
    isActive?: boolean,
    schoolId?: string
  ) {
    const skip = (page - 1) * limit;

    const where: any = schoolId ? { school_id: BigInt(schoolId) } : {};

    if (role) {
      where.role = role;
    }

    if (isActive !== undefined) {
      where.status = isActive
        ? 'active'
        : 'inactive';
    }

    const [users, total] =
      await Promise.all([
        prisma.app_user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            status: true,
            school_id: true,
            created_at: true,
          },
          skip,
          take: limit,
          orderBy: {
            created_at: 'desc',
          },
        }),

        prisma.app_user.count({
          where,
        }),
      ]);

    const formattedUsers = users.map((user) => {
      const nameParts = user.name
        .trim()
        .split(/\s+/);

      return {
        id: user.id.toString(),
        firstName: nameParts[0] || '',
        lastName:
          nameParts.slice(1).join(' ') || '',
        email: user.email,
        role: user.role,
        status: user.status,
        isActive: user.status === 'active',
        schoolId: user.school_id.toString(),
        createdAt: user.created_at,
      };
    });

    return {
      users: formattedUsers,
      total,
      page,
      limit,
    };
  }

  async toggleUserStatus(id: string, schoolId: string) {
    const user =
      await prisma.app_user.findFirst({
        where: { id: BigInt(id), school_id: BigInt(schoolId) },
      });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const newStatus =
      user.status === 'active'
        ? 'inactive'
        : 'active';

    const updated =
      await prisma.app_user.update({
        where: {
          id: BigInt(id),
        },
        data: {
          status: newStatus,
        },
        select: {
          id: true,
          email: true,
          status: true,
        },
      });

    return {
      id: updated.id.toString(),
      email: updated.email,
      status: updated.status,
      isActive: updated.status === 'active',
    };
  }
}

export default new AuthService();
