import prisma from '../src/lib/prisma.js';

/**
 * Student Controller
 * Handles all student-related endpoints
 */

// Get all students with pagination
const getAllStudents = async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    // Get total count
        const totalStudents = await prisma.student.count();

        const students = await prisma.student.findMany({
          skip: Number(offset),
          take: Number(limit),
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
      data: students,
      pagination: {
        total: totalStudents,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(totalStudents / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching students',
      error: error.message,
    });
  }
};

// Get student by ID with details
const getStudentById = async (req, res) => {
  const { id } = req.params;

  try {
    // Get student details
    const student = await prisma.student.findUnique({
      where: {
        id: BigInt(id)
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
      data: {
        student: student,
        parents: student.parent_detail,
        admissions: student.admission,
      },
    });
  } catch (error) {
    console.error('Error fetching student:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching student',
      error: error.message,
    });
  }
};

// Create new student
const createStudent = async (req, res) => {
  const {
    school_id,
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
  if (!first_name || !admission_number || !school_id) {
    return res.status(400).json({
      success: false,
      message: 'Missing required fields: first_name, admission_number, school_id',
    });
  }

  try {
    const student = await prisma.student.create({
      data: {
        school_id: BigInt(school_id),
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
        created_by: 'admin'
      }
    });

    res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: student,
    });
  } catch (error) {
    console.error('Error creating student:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating student',
      error: error.message,
    });
  }
};

const saveStudent = async (req, res) => {
  const {
    school_id,
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
      student = await prisma.student.update({
        where: {
          id: BigInt(id)
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
          school_id: BigInt(school_id),
          admission_number,
          first_name,
          last_name,
          date_of_birth: date_of_birth ? new Date(date_of_birth) : null,
          gender,
          blood_group,
          email,
          phone,
          status: 'active',
          created_by: 'admin'
        }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Student saved successfully',
      data: student,
    });
  } catch (error) {
    console.error('Error saving student:', error);
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
