import fs from 'fs';
import path from 'path';
import xlsx from 'xlsx';
import csv from 'csv-parser';

export interface StudentBulkData {
  studentId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  courseId: string;
  classId: string;
  city?: string;
  state?: string;
  parentPhone?: string;
  [key: string]: any;
}

export const parseExcelFile = (filePath: string): Promise<StudentBulkData[]> => {
  return new Promise((resolve, reject) => {
    try {
      const workbook = xlsx.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = xlsx.utils.sheet_to_json<StudentBulkData>(sheet);

      resolve(data);
    } catch (error) {
      reject(error);
    }
  });
};

export const parseCsvFile = (filePath: string): Promise<StudentBulkData[]> => {
  return new Promise((resolve, reject) => {
    const data: StudentBulkData[] = [];

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => data.push(row))
      .on('end', () => resolve(data))
      .on('error', (error) => reject(error));
  });
};

export const validateBulkUploadData = (data: StudentBulkData[]) => {
  const requiredFields = ['studentId', 'firstName', 'lastName', 'courseId', 'classId'];
  const errors: string[] = [];

  data.forEach((row, index) => {
    requiredFields.forEach((field) => {
      if (!row[field] || row[field].toString().trim() === '') {
        errors.push(`Row ${index + 1}: ${field} is required`);
      }
    });

    if (row.email && !isValidEmail(row.email.toString())) {
      errors.push(`Row ${index + 1}: Invalid email format`);
    }

    if (row.phone && !isValidPhone(row.phone.toString())) {
      errors.push(`Row ${index + 1}: Invalid phone format`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const cleanupFile = (filePath: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.unlink(filePath, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// Helper functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  return /^\d{10}$/.test(phone.replace(/^\+\d+|[^\d]/g, ''));
};

export const parseUploadFile = async (filePath: string): Promise<StudentBulkData[]> => {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.xlsx' || ext === '.xls') {
    return parseExcelFile(filePath);
  } else if (ext === '.csv') {
    return parseCsvFile(filePath);
  } else {
    throw new Error('Unsupported file format. Please upload CSV or Excel file.');
  }
};
