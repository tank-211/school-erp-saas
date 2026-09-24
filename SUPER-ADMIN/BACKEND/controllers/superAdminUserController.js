const bcrypt = require("bcryptjs");
const prisma = require("../config/prisma");
const { serializeBigInt } = require("../utils/bigintSerializer");

const ALLOWED_ROLES = new Set([
  "admin",
  "counselor",
  "accountant",
]);

const ALLOWED_STATUSES = new Set([
  "active",
  "inactive",
]);

// GET /api/super-admin/users
const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.app_user.findMany({
      select: {
        id: true,
        school_id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
      orderBy: {
        created_at: "desc",
      },
    });

    return res.json(
      serializeBigInt({
        users,
      })
    );
  } catch (err) {
    console.error("Get super admin users error:", err);

    return res.status(500).json({
      error: "Failed to fetch users.",
    });
  }
};


// POST /api/super-admin/users
const createUser = async (req, res) => {
  try {
    const {
      school_id,
      name,
      email,
      password,
      role = "counselor",
      status = "active",
    } = req.body;

    if (!school_id || !name || !email || !password) {
      return res.status(400).json({
        error: "School, name, email, and password are required.",
      });
    }

    if (!ALLOWED_ROLES.has(role)) {
      return res.status(400).json({
        error: "Invalid user role.",
      });
    }

    if (!ALLOWED_STATUSES.has(status)) {
      return res.status(400).json({
        error: "Invalid user status.",
      });
    }

    const schoolId = BigInt(school_id);

    // Verify school exists
    const school = await prisma.school.findUnique({
      where: {
        id: schoolId,
      },
      select: {
        id: true,
        name: true,
        is_active: true,
      },
    });

    if (!school) {
      return res.status(404).json({
        error: "School not found.",
      });
    }

    // Don't allow users to be created for inactive schools
    if (!school.is_active) {
      return res.status(400).json({
        error: "Cannot create a user for an inactive school.",
      });
    }

    // Check email
    const existingUser = await prisma.app_user.findUnique({
      where: {
        email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        error: "A user with this email already exists.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.app_user.create({
      data: {
        school_id: schoolId,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password_hash: passwordHash,
        role,
        status,
        created_by: req.staffUser?.full_name || "super_admin",
      },
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

    return res.status(201).json(
      serializeBigInt({
        message: "User created successfully.",
        user,
      })
    );
  } catch (err) {
    console.error("Create super admin user error:", err);

    if (err.code === "P2002") {
      return res.status(409).json({
        error: "A user with this email already exists.",
      });
    }

    return res.status(500).json({
      error: "Failed to create user.",
    });
  }
};


// PATCH /api/super-admin/users/:id
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      role,
      status,
      school_id,
    } = req.body;

    const userId = BigInt(id);

    const existingUser = await prisma.app_user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        school_id: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    const data = {};

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({
          error: "Name cannot be empty.",
        });
      }

      data.name = String(name).trim();
    }

    if (email !== undefined) {
      const normalizedEmail = String(email).trim().toLowerCase();

      if (!normalizedEmail) {
        return res.status(400).json({
          error: "Email cannot be empty.",
        });
      }

      data.email = normalizedEmail;
    }

    if (role !== undefined) {
      if (!ALLOWED_ROLES.has(role)) {
        return res.status(400).json({
          error: "Invalid user role.",
        });
      }

      data.role = role;
    }

    if (status !== undefined) {
      if (!ALLOWED_STATUSES.has(status)) {
        return res.status(400).json({
          error: "Invalid user status.",
        });
      }

      data.status = status;
    }

    if (school_id !== undefined) {
      const schoolId = BigInt(school_id);

      const school = await prisma.school.findUnique({
        where: {
          id: schoolId,
        },
        select: {
          id: true,
          is_active: true,
        },
      });

      if (!school) {
        return res.status(404).json({
          error: "School not found.",
        });
      }

      data.school_id = schoolId;
    }

    if (Object.keys(data).length === 0) {
      return res.status(400).json({
        error: "No fields to update.",
      });
    }

    data.updated_at = new Date();

    const user = await prisma.app_user.update({
      where: {
        id: userId,
      },
      data,
      select: {
        id: true,
        school_id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        created_at: true,
        updated_at: true,
      },
    });

    return res.json(
      serializeBigInt({
        message: "User updated successfully.",
        user,
      })
    );
  } catch (err) {
    console.error("Update super admin user error:", err);

    if (err.code === "P2002") {
      return res.status(409).json({
        error: "A user with this email already exists.",
      });
    }

    if (err.code === "P2025") {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    return res.status(500).json({
      error: "Failed to update user.",
    });
  }
};


// DELETE /api/super-admin/users/:id
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = BigInt(id);

    const existingUser = await prisma.app_user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    await prisma.app_user.delete({
      where: {
        id: userId,
      },
    });

    return res.json({
      message: "User deleted successfully.",
    });
  } catch (err) {
    console.error("Delete super admin user error:", err);

    if (err.code === "P2025") {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    return res.status(500).json({
      error: "Failed to delete user.",
    });
  }
};


// POST /api/super-admin/users/:id/reset-password
const resetUserPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: "New password is required.",
      });
    }

    if (String(password).length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters.",
      });
    }

    const userId = BigInt(id);

    const existingUser = await prisma.app_user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
      },
    });

    if (!existingUser) {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await prisma.app_user.update({
      where: {
        id: userId,
      },
      data: {
        password_hash: passwordHash,
        updated_at: new Date(),
      },
    });

    return res.json({
      message: "Password reset successfully.",
    });
  } catch (err) {
    console.error("Reset user password error:", err);

    if (err.code === "P2025") {
      return res.status(404).json({
        error: "User not found.",
      });
    }

    return res.status(500).json({
      error: "Failed to reset password.",
    });
  }
};


module.exports = {
  getAllUsers,
  createUser,
  updateUser,
  deleteUser,
  resetUserPassword,
};