import prisma from '../src/lib/prisma.js';
import { serializeBigInt } from '../utils/bigintSerializer.js';

/**
 * Student Controller
 * Handles all student-related endpoints.
 *
 * Every route runs after authMiddleware + requireSchool (routes/studentRoutes.js),
 * so req.schoolId is the caller's school (BigInt) from the token. All queries are
 * scoped to it; a school_id sent in the request body is ignored.
 */

const isId = (value) => /^\d+$/.test(String(value ?? ''));

// Get all students of the caller's school, with pagination
const getAllStudents = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
  const offset = (page - 1) * limit;
  const where = { school_id: req.schoolId };

  try {
    const totalStudents = await prisma.student.count({ where });

    const students = await prisma.student.findMany({
      where,
      skip: offset,
      take: limit,
      orderBy: {
        created_at: 'desc'
      },
      include: {
        school: {
          select: {
            name: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'Students retrieved successfully',
      data: serializeBigInt(students),
      pagination: {
        total: totalStudents,
        page,
        limit,
        pages: Math.ceil(totalStudents / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching students:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message,
    });
  }
};

// Get student by ID with details (own school only)
const getStudentById = async (req, res) => {
  const { id } = req.params;

  if (!isId(id)) {
    return res.status(400).json({ success: false, message: 'Invalid student id' });
  }

  try {
    const student = await prisma.student.findFirst({
      where: {
        id: BigInt(id),
        school_id: req.schoolId
      },
      include: {
        school: true,
        parent_detail: true,
        admission: {
          include: {
            academic_year: true,
            school_class: true,
            section: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student details retrieved successfully',
      data: serializeBigInt({
        student: student,
        parents: student.parent_detail,
        admissions: student.admission,
      }),
    });
  } catch (error) {
    console.error('Error fetching student:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error fetching student',
      error: error.message,
    });
  }
};

// Create new student in the caller's school
const createStudent = async (req, res) => {
  const {
    admission_number,
    first_name,
    last_name,
    date_of_birth,
    gender,
    email,
    phone,
    address,
    city,
    state,
    postal_code,
    country,
    blood_group,
  } = req.body;

  // Validation
  if (!first_name || !admission_number) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: first_name, admission_number',
    });
  }

  try {
    const student = await prisma.student.create({
      data: {
        school_id: req.schoolId,
        admission_number,
        first_name,
        last_name,
        date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
        gender,
        email,
        phone,
        address,
        city,
        state,
        postal_code,
        country,
        blood_group,
        status: 'active',
        created_by: String(req.user.id)
      }
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: serializeBigInt(student),
    });
  } catch (error) {
    console.error('Error creating student:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error creating student',
      error: error.message,
    });
  }
};

// Update a student of the caller's school (when id is given) or create one
const saveStudent = async (req, res) => {
  const {
    first_name,
    last_name,
    date_of_birth,
    gender,
    blood_group,
    email,
    phone,
    id // if id is passed, update, else create
  } = req.body;

  try {
    let student;

    if (id) {
      if (!isId(id)) {
        return res.status(400).json({ success: false, message: 'Invalid student id' });
      }

      const existing = await prisma.student.findFirst({
        where: { id: BigInt(id), school_id: req.schoolId },
        select: { id: true }
      });

      if (!existing) {
        return res.status(404).json({ success: false, message: 'Student not found' });
      }

      student = await prisma.student.update({
        where: {
          id: existing.id
        },
        data: {
          first_name,
          last_name,
          date_of_birth: date_of_birth ? new Date(date_of_birth) : undefined,
          gender,
          blood_group,
          email,
          phone,
          updated_at: new Date()
        }
      });
    } else {
      const admission_number = `ADM-${Date.now()}`;

      student = await prisma.student.create({
        data: {
          school_id: req.schoolId,
          admission_number,
          first_name,
          last_name,
          date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
          gender,
          blood_group,
          email,
          phone,
          status: 'active',
          created_by: String(req.user.id)
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student saved successfully',
      data: serializeBigInt(student),
    });
  } catch (error) {
    console.error('Error saving student:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error saving student',
      error: error.message,
    });
  }
};

export {
  getAllStudents,
  getStudentById,
  createStudent,
  saveStudent,
};
