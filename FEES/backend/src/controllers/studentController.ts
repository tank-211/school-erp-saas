import { Request, Response } from 'express';
import studentService from '../services/studentService';
import { sendSuccess, sendError } from '../utils/responseHelper';
import { asyncHandler } from '../middleware/errorHandler';
import { parseUploadFile, validateBulkUploadData } from '../utils/fileParser';
import multer from 'multer';
import path from 'path';
import logger from '../config/logger';

// Configure multer for file uploads
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(process.cwd(), 'uploads'));
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    },
  }),
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExt = path.extname(file.originalname).toLowerCase();

    if (allowedTypes.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV and Excel files are allowed'));
    }
  },
});

export const createStudent = asyncHandler(async (req: Request, res: Response) => {
  const data = {
    ...req.body,
    schoolId: req.user?.schoolId,
  };

  if (!data.schoolId) {
    return sendError(res, 'School ID is missing from authentication', [], 401);
  }

  const student = await studentService.createStudent(data);

  logger.info('Student created', {
    studentId: student.id.toString(),
    schoolId: data.schoolId,
  });

  sendSuccess(res, 'Student created successfully', student, 201);
});

export const getStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const student = await studentService.getStudentById(id, req.user!.schoolId);

  sendSuccess(res, 'Student retrieved successfully', student, 200);
});

export const updateStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const data = req.body;

  const student = await studentService.updateStudent(id, req.user!.schoolId, data);

  logger.info('Student updated', { studentId: id });

  sendSuccess(res, 'Student updated successfully', student, 200);
});

export const deleteStudent = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  await studentService.deleteStudent(id, req.user!.schoolId);

  logger.info('Student deleted', { studentId: id });

  sendSuccess(res, 'Student deleted successfully', null, 200);
});

export const searchStudents = async (req: Request, res: Response) => {
  try {
    const {
      page = '1',
      limit = '10',
      search,
      city,
      courseId,
      classId,
      status,
    } = req.query;

    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return sendError(
        res,
        'School context is required',
        [],
        401
      );
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const result = await studentService.searchStudents({
      schoolId,
      search: typeof search === 'string' ? search : undefined,
      city: typeof city === 'string' ? city : undefined,
      courseId: typeof courseId === 'string' ? courseId : undefined,
      classId: typeof classId === 'string' ? classId : undefined,
      status: typeof status === 'string' ? status : undefined,
      page: pageNumber,
      limit: limitNumber,
    });

    sendSuccess(
      res,
      'Students retrieved successfully',
      result,
      200
    );
  } catch (error) {
    logger.error(
      `Search students error: ${
        error instanceof Error ? error.message : String(error)
      }`
    );

    return sendError(
      res,
      error instanceof Error ? error.message : 'Failed to search students',
      [],
      400
    );
  }
};

export const bulkUploadStudents = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.file) {
      return sendError(res, 'No file uploaded', [], 400);
    }

    const schoolId = req.user?.schoolId;

    if (!schoolId) {
      return sendError(
        res,
        'School ID is missing from authentication',
        [],
        401
      );
    }

    // Parse file
    const fileData = await parseUploadFile(req.file.path);

    // Validate data
    const validation = validateBulkUploadData(fileData);

    if (!validation.isValid) {
      return sendError(
        res,
        'File validation failed',
        validation.errors,
        400
      );
    }

    // Bulk create
    const result = await studentService.bulkCreateStudents(
      fileData.map((student) => ({
        ...student,
        schoolId,
      }))
    );

    // Cleanup file
    const fs = require('fs');

    fs.unlink(req.file.path, (err: any) => {
      if (err) {
        logger.error('Failed to delete uploaded file', {
          error: err,
        });
      }
    });

    logger.info('Bulk upload completed', {
      created: result.created,
      failed: result.failed,
      schoolId,
    });

    sendSuccess(res, 'Bulk upload completed', result, 200);
  }
);

export const getStudentStats = asyncHandler(async (req: Request, res: Response) => {
  const stats = await studentService.getStudentStats(req.user!.schoolId);

  sendSuccess(res, 'Student statistics retrieved successfully', stats, 200);
});

export const uploadMiddleware = upload.single('file');
