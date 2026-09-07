import { StudentService } from '../services/studentService.js';
import { sendSuccessResponse, sendErrorResponse, createPaginatedResponse, getPaginationParams } from '../utils/responseHelper.js';
import logger from '../config/logger.js';

export const createStudent = async (req, res, next) => {
  try {
    const student = await StudentService.createStudent(req.validatedData);
    return sendSuccessResponse(res, 'Student created successfully', student, 201);
  } catch (error) {
    logger.error(`Create student error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const getStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await StudentService.getStudentById(id);
    return sendSuccessResponse(res, 'Student retrieved successfully', student);
  } catch (error) {
    logger.error(`Get student error: ${error.message}`);
    return sendErrorResponse(res, error.message, 404);
  }
};

export const updateStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await StudentService.updateStudent(id, req.validatedData);
    return sendSuccessResponse(res, 'Student updated successfully', student);
  } catch (error) {
    logger.error(`Update student error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const student = await StudentService.deleteStudent(id);
    return sendSuccessResponse(res, 'Student deleted successfully', student);
  } catch (error) {
    logger.error(`Delete student error: ${error.message}`);
    return sendErrorResponse(res, error.message, 404);
  }
};

export const searchStudents = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      city,
      course,
      class: classId,
      status
    } = req.query;

    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return sendErrorResponse(
        res,
        'School context is required',
        401
      );
    }

    const { skip, limit: paginationLimit } = getPaginationParams(
      page,
      limit
    );

    const result = await StudentService.searchStudents({
      schoolId,
      search: typeof search === 'string' ? search : undefined,
      city: typeof city === 'string' ? city : undefined,
      courseId: typeof course === 'string' ? course : undefined,
      classId: typeof classId === 'string' ? classId : undefined,
      status: typeof status === 'string' ? status : undefined,
      page: Math.floor(skip / paginationLimit) + 1,
      limit: paginationLimit
    });

    const response = createPaginatedResponse(
      result.students,
      result.total,
      result.page,
      result.limit
    );

    return sendSuccessResponse(
      res,
      'Students retrieved successfully',
      response
    );
  } catch (error) {
    logger.error(`Search students error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};

export const bulkUploadStudents = async (req, res, next) => {
  try {
    const { students } = req.body;

    if (!Array.isArray(students) || students.length === 0) {
      return sendErrorResponse(res, 'Students array is required and cannot be empty', 400);
    }

    const createdStudents = await StudentService.bulkCreateStudents(students);
    const response = {
      totalUploaded: createdStudents.length,
      students: createdStudents
    };

    return sendSuccessResponse(res, 'Students uploaded successfully', response, 201);
  } catch (error) {
    logger.error(`Bulk upload students error: ${error.message}`);
    return sendErrorResponse(res, error.message, 400);
  }
};
