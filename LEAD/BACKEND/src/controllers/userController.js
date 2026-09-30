import prisma from "../prisma/index.js";
import { getAllUsersService, inviteUserService, updateUserRoleService, toggleUserStatusService, getCounselorsService } from "../services/userService.js";
import { serializeBigInt } from "../utils/bigintSerializer.js";
import { successResponse, errorResponse } from "../utils/response.js";

export const getAllUsers = async (req, res) => {
  try {
    const users = await getAllUsersService(req.user.schoolId);

    const safeUsers = JSON.parse(
  JSON.stringify(
    users,
    (key, value) =>
      typeof value === "bigint"
        ? Number(value)
        : value
  )
);

res.status(200).json(
  successResponse(safeUsers, "Users fetched")
);
  } catch (error) {
    console.error("GET USERS ERROR:", error);

    res.status(400).json({
      success: false,
      message: error.message,
      stack: error.stack
    });
  }
};

export const inviteUser = async (req, res) => {
  // Only a school admin can add users (the role in the token is checked again below)
  if (req.user.role !== "admin") {
    return res.status(403).json({ success: false, message: "Only admins can add users" });
  }
  try {
    const admin = await prisma.user.findFirst({
      where: { id: BigInt(req.user.id), school_id: BigInt(req.user.schoolId), role: "admin", status: "active" },
      select: { id: true },
    });
    if (!admin) {
      return res.status(403).json({ success: false, message: "Only admins can add users" });
    }
    const user = await inviteUserService(req.body || {}, req.user.schoolId);
    res.status(201).json(successResponse(serializeBigInt(user), "User added"));
  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message,
    });
  }
};

export const updateUserRole = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      })
    }

    const { role } = req.body

    await updateUserRoleService(
      req.params.id,
      role,
      req.user.schoolId
    )

    res.json({
      success: true,
      message: "Role updated"
    })

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
}
export const toggleUserStatus = async (req, res) => {
  try {

    if (req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied"
      })
    }

    const user = await toggleUserStatusService(
      req.params.id,
      req.user.schoolId
    )

    res.json({
      success: true,
      data: user,
      message: "User status updated"
    })

  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message
    })
  }
};
export const getCounselors = async (req, res) => {
  try {
    const counselors = await getCounselorsService(req.user.schoolId);

    console.log("COUNSELORS FROM DB:");
    console.log(counselors);

    const safe = JSON.parse(
      JSON.stringify(
        counselors,
        (k, v) => (typeof v === "bigint" ? Number(v) : v)
      )
    );

    console.log("COUNSELORS SENT TO FRONTEND:");
    console.log(safe);

    res.json({
      success: true,
      data: safe,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};