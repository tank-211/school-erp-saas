import Student from '../models/Student.js';
import logger from '../config/logger.js';

export class StudentService {
  static async createStudent(studentData) {
    try {
      const existingStudent = await Student.findOne({ 
        studentId: studentData.studentId 
      });

      if (existingStudent) {
        throw new Error('Student ID already exists');
      }

      const student = new Student(studentData);
      await student.save();

      logger.info(`Student created: ${student.studentId}`);
      return student;
    } catch (error) {
      logger.error(`Create student error: ${error.message}`);
      throw error;
    }
  }

  static async getStudentById(studentId) {
    try {
      const student = await Student.findById(studentId)
        .populate('course')
        .populate('class');

      if (!student) {
        throw new Error('Student not found');
      }

      return student;
    } catch (error) {
      logger.error(`Get student error: ${error.message}`);
      throw error;
    }
  }

  static async updateStudent(studentId, updateData) {
    try {
      const student = await Student.findByIdAndUpdate(
        studentId,
        updateData,
        { new: true, runValidators: true }
      ).populate('course').populate('class');

      if (!student) {
        throw new Error('Student not found');
      }

      logger.info(`Student updated: ${student.studentId}`);
      return student;
    } catch (error) {
      logger.error(`Update student error: ${error.message}`);
      throw error;
    }
  }

  static async deleteStudent(studentId) {
    try {
      const student = await Student.findByIdAndDelete(studentId);

      if (!student) {
        throw new Error('Student not found');
      }

      logger.info(`Student deleted: ${student.studentId}`);
      return student;
    } catch (error) {
      logger.error(`Delete student error: ${error.message}`);
      throw error;
    }
  }

  static async searchStudents(filters, skip, limit) {
    try {
      const students = await Student.find(filters)
        .populate('course')
        .populate('class')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 });

      const total = await Student.countDocuments(filters);

      return { students, total };
    } catch (error) {
      logger.error(`Search students error: ${error.message}`);
      throw error;
    }
  }

  static async bulkCreateStudents(studentsData) {
    try {
      const students = await Student.insertMany(studentsData, { ordered: false });
      logger.info(`Bulk students created: ${students.length} records`);
      return students;
    } catch (error) {
      logger.error(`Bulk create students error: ${error.message}`);
      throw error;
    }
  }
}
