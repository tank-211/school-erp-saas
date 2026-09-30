import prisma from '../src/lib/prisma.js';
import { serializeBigInt } from '../utils/bigintSerializer.js';

export {
  getAllSchools,
  getSchoolById,
  createSchool,
  getSchoolCounselors,
  getOwnSchool,
  updateOwnSchool,
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
        // Admins guide tours and take leads too
        role: { in: ['counselor', 'admin'] },
        status: 'active'
      },
      select: {
        id: true,
        name: true,
        role: true
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

// Fields a school admin may change about their own school. The name, plan,
// status and expiry are managed by Super Admin.
const EDITABLE_SCHOOL_FIELDS = {
  email: 100,
  phone: 20,
  address: 1000,
  city: 100,
  state: 100,
  postal_code: 20,
  country: 100,
  principal_name: 150,
};

const schoolProfile = (school) => ({
  id: String(school.id),
  name: school.name,
  email: school.email,
  phone: school.phone,
  address: school.address,
  city: school.city,
  state: school.state,
  postal_code: school.postal_code,
  country: school.country,
  principal_name: school.principal_name,
  plan_type: school.plan_type,
  expiry_date: school.expiry_date,
});

// GET /api/schools/me
async function getOwnSchool(req, res) {
  try {
    const school = await prisma.school.findUnique({ where: { id: req.schoolId } });
    if (!school) return res.status(404).json({ success: false, message: 'School not found' });
    res.json({ success: true, data: schoolProfile(school) });
  } catch (error) {
    console.error('Get own school error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load school details' });
  }
}

// PUT /api/schools/me  (school admin)
async function updateOwnSchool(req, res) {
  const data = {};
  for (const [field, max] of Object.entries(EDITABLE_SCHOOL_FIELDS)) {
    if (req.body?.[field] === undefined) continue;
    const value = req.body[field] === null ? '' : String(req.body[field]).trim();
    if (value.length > max) {
      return res.status(400).json({ success: false, message: `${field.replace('_', ' ')} must be ${max} characters or fewer` });
    }
    data[field] = value || null;
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    return res.status(400).json({ success: false, message: 'Contact email is not valid' });
  }
  if (!Object.keys(data).length) {
    return res.status(400).json({ success: false, message: 'Nothing to update' });
  }
  try {
    const school = await prisma.school.update({
      where: { id: req.schoolId },
      data: { ...data, updated_at: new Date(), updated_by: String(req.user.email || req.user.id).slice(0, 100) },
    });
    res.json({ success: true, message: 'School details saved', data: schoolProfile(school) });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'Another school already uses this contact email' });
    }
    console.error('Update own school error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to save school details' });
  }
}
