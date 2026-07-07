import prisma from '../src/lib/prisma.js';

/**
 * School Controller
 * Handles all school-related endpoints
 */
export {
  getAllSchools,
  getSchoolById,
  createSchool,
  getSchoolCounselors,
};
// Get all schools
const getAllSchools = async (req, res) => {
  try {
    const result = await prisma.school.findMany({
      orderBy: {
        created_at: 'desc'
      }
    });

    res.status(200).json({
      success: true,
      message: 'Schools retrieved successfully',
      count: result.length,
      data: result,
    });
  } catch (error) {
    console.error('Error fetching schools:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching schools',
      error: error.message,
    });
  }
};

// Get school by ID
const getSchoolById = async (req, res) => {
  const { id } = req.params;

  try {
    const result = await prisma.school.findUnique({
      where: {
        id: BigInt(id)
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
      data: result,
    });
  } catch (error) {
    console.error('Error fetching school:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching school',
      error: error.message,
    });
  }
};

// Create new school
const createSchool = async (req, res) => {
  const {
    name,
    email,
    phone,
    address,
    city,
    state,
    postal_code,
    country,
    established_year,
    principal_name,
  } = req.body;

  // Validation
  if (!name) {
    return res.status(400).json({
      success: false,
      message: 'School name is required',
    });
  }

  try {
    const result = await prisma.school.create({
      data: {
        name,
        email,
        phone,
        address,
        city,
        state,
        postal_code,
        country,
        established_year,
        principal_name,
        status: 'active',
        created_by: 'admin'
      }
    });

    res.status(201).json({
      success: true,
      message: 'School created successfully',
      data: result,
    });
  } catch (error) {
    console.error('Error creating school:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating school',
      error: error.message,
    });
  }
};

// Get counselors by school ID
const getSchoolCounselors = async (req, res) => {
  const { schoolId } = req.params;

  try {
    const counselors = await prisma.app_user.findMany({
      where: {
        school_id: BigInt(schoolId),
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
      data: counselors,
    });
  } catch (error) {
    console.error('Error fetching counselors:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching counselors',
      error: error.message,
    });
  }
};


