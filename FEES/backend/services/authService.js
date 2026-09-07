import User from '../models/User.js';
import { hashPassword, comparePassword } from '../config/encryption.js';
import { generateAccessToken, generateRefreshToken } from '../config/jwt.js';
import logger from '../config/logger.js';

export class AuthService {
  static async register(userData) {
    try {
      const existingUser = await User.findOne({
        $or: [{ email: userData.email }, { phone: userData.phone }]
      });

      if (existingUser) {
        throw new Error('Email or phone already exists');
      }

      const hashedPassword = await hashPassword(userData.password);
      const user = new User({
        ...userData,
        password: hashedPassword
      });

      await user.save();
      logger.info(`User registered successfully: ${user.email}`);

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      };
    } catch (error) {
      logger.error(`Registration error: ${error.message}`);
      throw error;
    }
  }

  static async login(email, password) {
    try {
      const user = await User.findOne({ email }).select('+password');

      if (!user || !user.isActive) {
        throw new Error('Invalid email or password');
      }

      const isPasswordValid = await comparePassword(password, user.password);

      if (!isPasswordValid) {
        throw new Error('Invalid email or password');
      }

      const accessToken = generateAccessToken(user._id, user.role);
      const refreshToken = generateRefreshToken(user._id);

      user.refreshTokens.push({ token: refreshToken });
      user.lastLogin = new Date();
      await user.save();

      logger.info(`User logged in: ${user.email}`);

      return {
        accessToken,
        refreshToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          department: user.department
        }
      };
    } catch (error) {
      logger.error(`Login error: ${error.message}`);
      throw error;
    }
  }

  static async refreshAccessToken(userId, refreshToken) {
    try {
      const user = await User.findById(userId);

      if (!user) {
        throw new Error('User not found');
      }

      const tokenExists = user.refreshTokens.some(rt => rt.token === refreshToken);

      if (!tokenExists) {
        throw new Error('Refresh token not found');
      }

      const newAccessToken = generateAccessToken(user._id, user.role);

      return {
        accessToken: newAccessToken,
        user: {
          _id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      };
    } catch (error) {
      logger.error(`Token refresh error: ${error.message}`);
      throw error;
    }
  }

  static async logout(userId, refreshToken) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { $pull: { refreshTokens: { token: refreshToken } } },
        { new: true }
      );

      if (!user) {
        throw new Error('User not found');
      }

      logger.info(`User logged out: ${user.email}`);
      return user;
    } catch (error) {
      logger.error(`Logout error: ${error.message}`);
      throw error;
    }
  }
}
