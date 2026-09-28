import prisma from '../src/lib/prisma.js';
import { serializeBigInt } from '../utils/bigintSerializer.js';

// Every route runs after authMiddleware + requireSchool (routes/parentRoutes.js),
// so req.schoolId is the caller's school (BigInt) from the token. A school_id in
// the request body is ignored.

const isId = (value) => /^\d+$/.test(String(value ?? ''));

// Get parent by ID (own school only)
export const getParentById = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid parent id' });
  }

  try {
    const parent = await prisma.parent_detail.findFirst({
      where: {
        id: BigInt(id),
        school_id: req.schoolId
      }
    });

    if (!parent) {
      return res.status(404).json({
        success: false,
        message: 'Parent not found'
      });
    }

    res.status(200).json({
      success: true,
      data: serializeBigInt(parent)
    });
  } catch (error) {
    console.error('Error fetching parent:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching parent',
      error: error.message
    });
  }
};

// Save parent information for a student of the caller's school
export const saveParent = async (req, res) => {
  const {
    student_id,
    relation,
    first_name,
    last_name,
    email,
    phone,
    occupation
  } = req.body;

  if (!isId(student_id)) {
    return res.status(400).json({ success: false, message: 'Valid student_id is required' });
  }

  try {
    // The student must belong to the caller's school
    const student = await prisma.student.findFirst({
      where: { id: BigInt(student_id), school_id: req.schoolId },
      select: { id: true }
    });

    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found' });
    }

    const existingParent =
      await prisma.parent_detail.findFirst({
        where: {
          student_id: student.id,
          school_id: req.schoolId,
          relation: relation || 'Father'
        }
      });

    let parent;

    if (existingParent) {
      parent =
        await prisma.parent_detail.update({
          where: {
            id: existingParent.id
          },
          data: {
            first_name,
            last_name,
            email,
            phone,
            occupation,
            updated_at: new Date()
          }
        });
    } else {
      parent =
        await prisma.parent_detail.create({
          data: {
            school_id: req.schoolId,
            student_id: student.id,
            relation: relation || 'Father',
            first_name,
            last_name,
            email,
            phone,
            occupation
          }
        });
    }

    res.status(200).json({
      success: true,
      message: 'Parent information saved successfully',
      data: serializeBigInt(parent)
    });
  } catch (error) {
    console.error('Error saving parent:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error saving parent',
      error: error.message
    });
  }
};
