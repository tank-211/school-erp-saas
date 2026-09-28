import prisma from '../src/lib/prisma.js';
import { serializeBigInt } from '../utils/bigintSerializer.js';

export {
  getAllSchools,
  getSchoolById,
  createSchool,
  getSchoolCounselors,
};

// Every route runs after authMiddleware + requireSchool (routes/schoolRoutes.js),
// so req.schoolId is the caller's school (BigInt) from the token.

const isId = (value) => /^\d+$/.test(String(value ?? ''));

// Returns only the caller's own school, as a one-item list, so a school user can
// never enumerate other tenants. The platform-wide list lives in Super Admin.
const getAllSchools = async (req, res) => {
  try {
    const result = await prisma.school.findMany({
      where: {
        id: req.schoolId
      }
    });

    res.status(200).json({
      success: true,
      message: 'Schools retrieved successfully',
      count: result.length,
      data: serializeBigInt(result),
    });
  } catch (error) {
    console.error('Error fetching schools:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching schools',
      error: error.message,
    });
  }
};

const getSchoolById = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid school id' });
  }

  // A school user may only read their own school
  if (BigInt(id) !== req.schoolId) {
    return res.status(404).json({
      success: false,
      message: 'School not found',
    });
  }

  try {
    const result = await prisma.school.findUnique({
      where: {
        id: req.schoolId
      }
    });

    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'School not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'School retrieved successfully',
      data: serializeBigInt(result),
    });
  } catch (error) {
    console.error('Error fetching school:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching school',
      error: error.message,
    });
  }
};

// Schools are created by platform staff in the Super Admin portal, which also
// provisions the school's first admin. Creating one here is not allowed.
const createSchool = async (req, res) => {
  return res.status(403).json({
    success: false,
    message: 'Schools are created in the Super Admin portal.',
  });
};

const getSchoolCounselors = async (req, res) => {
  const { schoolId } = req.params;

  if (!isId(schoolId)) {
    return res.status(400).json({ success: false, message: 'Invalid school id' });
  }

  // A school user may only list counselors of their own school
  if (BigInt(schoolId) !== req.schoolId) {
    return res.status(404).json({
      success: false,
      message: 'School not found',
    });
  }

  try {
    const counselors = await prisma.app_user.findMany({
      where: {
        school_id: req.schoolId,
        role: 'counselor',
        status: 'active'
      },
      select: {
        id: true,
        name: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Counselors retrieved successfully',
      count: counselors.length,
      data: serializeBigInt(counselors),
    });
  } catch (error) {
    console.error('Error fetching counselors:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching counselors',
      error: error.message,
    });
  }
};
