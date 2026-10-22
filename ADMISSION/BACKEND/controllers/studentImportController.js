/**
 * Import of a school's existing students (school admins).
 * The rules are in utils/studentImport.js (shared with Super Admin).
 */
import prisma from '../src/lib/prisma.js';
import { readSheetRows, writeWorkbook } from '../utils/sheetFile.js';
import {
  validateImport,
  previewForClient,
  commitImport,
  listBatches,
  undoBatch,
  followUpList,
  assignClass,
  recordDocument,
  loadSchoolLookups,
  templateSheets,
  ImportError,
  MAX_IMPORT_ROWS,
} from '../utils/studentImport.js';

const actorOf = (req) => String(req.user?.name || req.user?.full_name || req.user?.email || req.user?.id || '').slice(0, 100) || null;

const handle = (res, error, what) => {
  if (error instanceof ImportError) {
    return res.status(error.status).json({ success: false, message: error.message, ...(error.details ? { details: error.details } : {}) });
  }
  console.error(`Student import (${what}) failed:`, error?.message);
  return res.status(500).json({ success: false, message: `Could not ${what}. Please try again.` });
};

const sheetRowsFrom = (req) => {
  if (!req.file?.buffer) throw new ImportError('Choose the filled-in Excel or CSV file.', 400);
  let rows;
  try {
    rows = readSheetRows(req.file.buffer);
  } catch {
    throw new ImportError('The file could not be read. Upload the template as .xlsx or .csv.', 400);
  }
  if (rows.length > MAX_IMPORT_ROWS + 50) throw new ImportError(`At most ${MAX_IMPORT_ROWS} students can be imported at once; split the file.`, 400);
  return rows;
};

export const downloadTemplate = async (req, res) => {
  try {
    const lookups = await loadSchoolLookups(prisma, req.schoolId);
    const buffer = writeWorkbook(templateSheets(lookups));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="existing-students-template.xlsx"');
    return res.send(buffer);
  } catch (error) {
    return handle(res, error, 'create the template');
  }
};

export const previewImport = async (req, res) => {
  try {
    const result = await validateImport(prisma, req.schoolId, sheetRowsFrom(req));
    return res.json({ success: true, data: previewForClient(result) });
  } catch (error) {
    return handle(res, error, 'check the file');
  }
};

export const runImport = async (req, res) => {
  try {
    const data = await commitImport(prisma, {
      schoolId: req.schoolId,
      sheetRows: sheetRowsFrom(req),
      fileName: req.file?.originalname,
      actor: actorOf(req),
    });
    return res.status(201).json({ success: true, data, message: `${data.student_count} students imported.` });
  } catch (error) {
    return handle(res, error, 'import the students');
  }
};

export const getBatches = async (req, res) => {
  try {
    return res.json({ success: true, data: await listBatches(prisma, req.schoolId) });
  } catch (error) {
    if (/student_import_batch|P2021/.test(`${error?.code} ${error?.message}`)) {
      return res.status(501).json({ success: false, message: 'Student import is not set up in the database yet. Run prisma/sql/2026-10-22_existing_student_import.sql in Neon.' });
    }
    return handle(res, error, 'load the imports');
  }
};

export const undoImport = async (req, res) => {
  try {
    const data = await undoBatch(prisma, { schoolId: req.schoolId, batchId: req.params.id, actor: actorOf(req) });
    return res.json({ success: true, data, message: `Import undone: ${data.students_removed} students removed.` });
  } catch (error) {
    return handle(res, error, 'undo the import');
  }
};

export const getFollowUp = async (req, res) => {
  try {
    const [list, lookups] = await Promise.all([followUpList(prisma, req.schoolId), loadSchoolLookups(prisma, req.schoolId)]);
    return res.json({
      success: true,
      data: {
        ...list,
        classes: lookups.classes.map((c) => ({
          id: String(c.id),
          name: c.class_name,
          sections: lookups.sections.filter((s) => String(s.class_id) === String(c.id)).map((s) => ({ id: String(s.id), name: s.section_name })),
        })),
      },
    });
  } catch (error) {
    return handle(res, error, 'load the follow-up list');
  }
};

export const setClass = async (req, res) => {
  try {
    const data = await assignClass(prisma, {
      schoolId: req.schoolId,
      admissionId: req.params.id,
      classId: req.body?.class_id,
      sectionId: req.body?.section_id,
    });
    return res.json({ success: true, data, message: `Class set to ${data.class_name} ${data.section_name}.` });
  } catch (error) {
    return handle(res, error, 'set the class');
  }
};

export const addDocument = async (req, res) => {
  try {
    const file = req.file
      ? { file_name: req.file.originalname, file_path: `/uploads/${req.file.filename}`, file_size: req.file.size, mime_type: req.file.mimetype }
      : null;
    const data = await recordDocument(prisma, {
      schoolId: req.schoolId,
      admissionId: req.params.id,
      documentType: String(req.body?.document_type || ''),
      file,
      actor: actorOf(req),
    });
    return res.json({ success: true, data, message: `${data.label} ${file ? 'uploaded' : 'marked as received'}.` });
  } catch (error) {
    return handle(res, error, 'save the document');
  }
};
