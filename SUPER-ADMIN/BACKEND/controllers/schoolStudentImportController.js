/**
 * Import of a school's existing students by the platform team
 * (Super Admin → Schools → Import students). Same rules as the school admin's
 * import in the Admission app (utils/studentImport.mjs is a copy of
 * ADMISSION/BACKEND/utils/studentImport.js).
 *
 * The file arrives as base64 in JSON ({ file_name, file_base64 }); it is read
 * in memory and never stored.
 */
const prisma = require('../config/prisma');
const { serializeBigInt } = require('../utils/bigintSerializer');
const { readSheetRows, writeWorkbook } = require('../utils/sheetFile');

const importer = () => import('../utils/studentImport.mjs');
const MAX_FILE_BYTES = 5 * 1024 * 1024;

const schoolIdOf = (req) => (/^\d+$/.test(String(req.params.id || '')) ? BigInt(req.params.id) : null);
const actorOf = (req) => String(req.staffUser?.full_name || req.staffUser?.email || 'Platform team').slice(0, 100);

const handle = async (res, error, what) => {
  const { ImportError } = await importer();
  if (error instanceof ImportError) {
    return res.status(error.status).json({ error: error.message, ...(error.details ? { details: error.details } : {}) });
  }
  console.error(`School student import (${what}) failed:`, error?.message);
  return res.status(500).json({ error: `Could not ${what}. Please try again.` });
};

// Every route: the school must exist
const withSchool = (what, fn) => async (req, res) => {
  try {
    const schoolId = schoolIdOf(req);
    if (!schoolId) return res.status(400).json({ error: 'Invalid school id.' });
    const school = await prisma.school.findUnique({ where: { id: schoolId }, select: { id: true, name: true } });
    if (!school) return res.status(404).json({ error: 'School not found.' });
    return await fn(req, res, school);
  } catch (error) {
    return handle(res, error, what);
  }
};

const sheetRowsFrom = async (req) => {
  const { ImportError, MAX_IMPORT_ROWS } = await importer();
  const b64 = String(req.body?.file_base64 || '').replace(/^data:[^,]*,/, '');
  if (!b64) throw new ImportError('Choose the filled-in Excel or CSV file.', 400);
  if (!/\.(xlsx|xls|csv)$/i.test(String(req.body?.file_name || ''))) throw new ImportError('Upload the template as .xlsx, .xls or .csv.', 400);
  const buffer = Buffer.from(b64, 'base64');
  if (!buffer.length || buffer.length > MAX_FILE_BYTES) throw new ImportError('The file must be under 5 MB.', 400);
  let rows;
  try {
    rows = readSheetRows(buffer);
  } catch {
    throw new ImportError('The file could not be read. Upload the template as .xlsx or .csv.', 400);
  }
  if (rows.length > MAX_IMPORT_ROWS + 50) throw new ImportError(`At most ${MAX_IMPORT_ROWS} students can be imported at once; split the file.`, 400);
  return rows;
};

const downloadTemplate = withSchool('create the template', async (req, res, school) => {
  const { loadSchoolLookups, templateSheets } = await importer();
  const buffer = writeWorkbook(templateSheets(await loadSchoolLookups(prisma, school.id)));
  const safe = school.name.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40) || 'school';
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${safe}-existing-students.xlsx"`);
  return res.send(buffer);
});

const previewImport = withSchool('check the file', async (req, res, school) => {
  const { validateImport, previewForClient } = await importer();
  const result = await validateImport(prisma, school.id, await sheetRowsFrom(req));
  return res.json(serializeBigInt({ school_name: school.name, ...previewForClient(result) }));
});

const runImport = withSchool('import the students', async (req, res, school) => {
  const { commitImport } = await importer();
  const data = await commitImport(prisma, {
    schoolId: school.id,
    sheetRows: await sheetRowsFrom(req),
    fileName: req.body?.file_name,
    actor: actorOf(req),
  });
  return res.status(201).json({ message: `${data.student_count} students imported into ${school.name}.`, ...data });
});

const getBatches = withSchool('load the imports', async (req, res, school) => {
  const { listBatches } = await importer();
  try {
    return res.json({ school_name: school.name, batches: await listBatches(prisma, school.id) });
  } catch (error) {
    if (/student_import_batch|P2021/.test(`${error?.code} ${error?.message}`)) {
      return res.status(501).json({ error: 'Student import is not set up in the database yet. Run ADMISSION/BACKEND/prisma/sql/2026-10-22_existing_student_import.sql in Neon.' });
    }
    throw error;
  }
});

const undoImport = withSchool('undo the import', async (req, res, school) => {
  const { undoBatch } = await importer();
  const data = await undoBatch(prisma, { schoolId: school.id, batchId: req.params.batchId, actor: actorOf(req) });
  return res.json({ message: `Import undone: ${data.students_removed} students removed.`, ...data });
});

const getFollowUp = withSchool('load the follow-up list', async (req, res, school) => {
  const { followUpList, loadSchoolLookups } = await importer();
  const [list, lookups] = await Promise.all([followUpList(prisma, school.id), loadSchoolLookups(prisma, school.id)]);
  return res.json({
    school_name: school.name,
    ...list,
    classes: lookups.classes.map((c) => ({
      id: String(c.id),
      name: c.class_name,
      sections: lookups.sections.filter((s) => String(s.class_id) === String(c.id)).map((s) => ({ id: String(s.id), name: s.section_name })),
    })),
  });
});

const setClass = withSchool('set the class', async (req, res, school) => {
  const { assignClass } = await importer();
  const data = await assignClass(prisma, {
    schoolId: school.id,
    admissionId: req.params.admissionId,
    classId: req.body?.class_id,
    sectionId: req.body?.section_id,
  });
  return res.json({ message: `Class set to ${data.class_name} ${data.section_name}.`, ...data });
});

// The platform team records paper copies; scans are uploaded by the school in Admission
const addDocument = withSchool('save the document', async (req, res, school) => {
  const { recordDocument } = await importer();
  const data = await recordDocument(prisma, {
    schoolId: school.id,
    admissionId: req.params.admissionId,
    documentType: String(req.body?.document_type || ''),
    file: null,
    actor: actorOf(req),
  });
  return res.json({ message: `${data.label} marked as received.`, ...data });
});

module.exports = { downloadTemplate, previewImport, runImport, getBatches, undoImport, getFollowUp, setClass, addDocument };
