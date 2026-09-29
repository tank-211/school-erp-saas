/**
 * controllers/setupController.js
 * School setup: academic years, classes and sections for the caller's school.
 *
 * Mounted at /api/setup (routes/setupRoutes.js) behind authMiddleware +
 * requireSchool, so req.schoolId is always the caller's school (BigInt).
 * Writes additionally require isAdmin.
 *
 * "Active academic year": ADMISSION reads `is_active = true`, LEAD reads
 * `status = 'active'`. Both are always written together here, and at most one
 * year per school is active.
 *
 * Deletes: academic_year, school_class and section cascade in the database
 * (deleting a class would delete its admissions and fee structures), so a
 * record can only be deleted while nothing references it.
 */
import prisma from '../src/lib/prisma.js';
import { serializeBigInt } from '../utils/bigintSerializer.js';

const isId = (value) => /^\d+$/.test(String(value ?? ''));
const text = (value) => (value === undefined || value === null ? '' : String(value).trim());

const fail = (res, status, message) => res.status(status).json({ success: false, message });

const parseDate = (value) => {
  const raw = text(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw ? null : date;
};

const dateOnly = (date) => (date ? new Date(date).toISOString().slice(0, 10) : null);

const isUniqueError = (error) => error?.code === 'P2002';

const handleError = (res, error, what) => {
  if (isUniqueError(error)) {
    return fail(res, 409, `${what} already exists`);
  }
  console.error(`Setup error (${what}):`, error.message);
  return fail(res, 500, error.message || 'Setup request failed');
};

const shapeYear = (year) => ({
  id: String(year.id),
  year_name: year.year_name,
  start_date: dateOnly(year.start_date),
  end_date: dateOnly(year.end_date),
  is_active: Boolean(year.is_active),
  status: year.status,
});

/* ------------------------------------------------------------------ */
/* Overview                                                            */
/* ------------------------------------------------------------------ */

// GET /api/setup/overview
export const getSetupOverview = async (req, res) => {
  try {
    const [years, classes] = await Promise.all([
      prisma.academic_year.findMany({
        where: { school_id: req.schoolId },
        orderBy: { start_date: 'desc' },
      }),
      prisma.school_class.findMany({
        where: { school_id: req.schoolId },
        orderBy: { class_numeric_value: 'asc' },
        include: {
          section: { orderBy: { section_name: 'asc' } },
        },
      }),
    ]);

    const activeYear = years.find((y) => y.is_active) || null;
    const sectionCount = classes.reduce((n, c) => n + (c.section?.length || 0), 0);

    res.status(200).json({
      success: true,
      data: {
        academic_years: years.map(shapeYear),
        classes: serializeBigInt(
          classes.map((c) => ({
            id: c.id,
            class_name: c.class_name,
            class_numeric_value: c.class_numeric_value,
            medium: c.medium,
            description: c.description,
            sections: (c.section || []).map((s) => ({
              id: s.id,
              section_name: s.section_name,
              capacity: s.capacity,
              class_teacher: s.class_teacher,
            })),
          }))
        ),
        checklist: {
          has_active_year: Boolean(activeYear),
          active_year: activeYear ? shapeYear(activeYear) : null,
          class_count: classes.length,
          section_count: sectionCount,
          classes_without_sections: classes.filter((c) => !c.section?.length).map((c) => c.class_name),
          ready_for_leads: Boolean(activeYear),
          ready_for_admissions: Boolean(activeYear) && classes.some((c) => c.section?.length),
        },
      },
    });
  } catch (error) {
    handleError(res, error, 'Setup overview');
  }
};

/* ------------------------------------------------------------------ */
/* Academic years                                                      */
/* ------------------------------------------------------------------ */

const validateYear = (body, existing = null) => {
  const year_name = body.year_name !== undefined ? text(body.year_name) : existing?.year_name;
  const start = body.start_date !== undefined ? parseDate(body.start_date) : existing?.start_date;
  const end = body.end_date !== undefined ? parseDate(body.end_date) : existing?.end_date;

  if (!year_name) return { error: 'Year name is required (for example 2026-27)' };
  if (year_name.length > 50) return { error: 'Year name must be 50 characters or fewer' };
  if (!start) return { error: 'Start date is required as YYYY-MM-DD' };
  if (!end) return { error: 'End date is required as YYYY-MM-DD' };
  if (new Date(start) >= new Date(end)) return { error: 'End date must be after start date' };
  return { year_name, start, end };
};

// Makes one year active and every other year of the school inactive, in one transaction.
const activateYear = (tx, schoolId, yearId, actor) =>
  Promise.all([
    tx.academic_year.updateMany({
      where: { school_id: schoolId, NOT: { id: yearId } },
      data: { is_active: false, updated_at: new Date(), updated_by: actor },
    }),
    // Only years marked active by status are switched off; "completed" stays completed
    tx.academic_year.updateMany({
      where: { school_id: schoolId, NOT: { id: yearId }, status: 'active' },
      data: { status: 'inactive' },
    }),
    tx.academic_year.update({
      where: { id: yearId },
      data: { is_active: true, status: 'active', updated_at: new Date(), updated_by: actor },
    }),
  ]);

// POST /api/setup/academic-years  { year_name, start_date, end_date, make_active }
export const createAcademicYear = async (req, res) => {
  const checked = validateYear(req.body);
  if (checked.error) return fail(res, 400, checked.error);

  try {
    const actor = String(req.user.id);
    const existingActive = await prisma.academic_year.count({
      where: { school_id: req.schoolId, is_active: true },
    });
    // The first year of a school is always made active
    const makeActive = req.body.make_active === true || existingActive === 0;

    const year = await prisma.$transaction(async (tx) => {
      const created = await tx.academic_year.create({
        data: {
          school_id: req.schoolId,
          year_name: checked.year_name,
          start_date: checked.start,
          end_date: checked.end,
          is_active: false,
          status: 'inactive',
          created_by: actor,
        },
      });
      if (makeActive) {
        await activateYear(tx, req.schoolId, created.id, actor);
      }
      return tx.academic_year.findUnique({ where: { id: created.id } });
    });

    res.status(201).json({ success: true, message: 'Academic year added', data: shapeYear(year) });
  } catch (error) {
    handleError(res, error, 'An academic year with this name');
  }
};

// PATCH /api/setup/academic-years/:id  { year_name?, start_date?, end_date? }
export const updateAcademicYear = async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 400, 'Invalid academic year id');

  try {
    const existing = await prisma.academic_year.findFirst({
      where: { id: BigInt(req.params.id), school_id: req.schoolId },
    });
    if (!existing) return fail(res, 404, 'Academic year not found');

    const checked = validateYear(req.body, existing);
    if (checked.error) return fail(res, 400, checked.error);

    const year = await prisma.academic_year.update({
      where: { id: existing.id },
      data: {
        year_name: checked.year_name,
        start_date: checked.start,
        end_date: checked.end,
        updated_at: new Date(),
        updated_by: String(req.user.id),
      },
    });

    res.status(200).json({ success: true, message: 'Academic year updated', data: shapeYear(year) });
  } catch (error) {
    handleError(res, error, 'An academic year with this name');
  }
};

// POST /api/setup/academic-years/:id/activate
export const activateAcademicYear = async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 400, 'Invalid academic year id');

  try {
    const existing = await prisma.academic_year.findFirst({
      where: { id: BigInt(req.params.id), school_id: req.schoolId },
      select: { id: true },
    });
    if (!existing) return fail(res, 404, 'Academic year not found');

    await prisma.$transaction((tx) => activateYear(tx, req.schoolId, existing.id, String(req.user.id)));
    const year = await prisma.academic_year.findUnique({ where: { id: existing.id } });

    res.status(200).json({ success: true, message: `${year.year_name} is now the active year`, data: shapeYear(year) });
  } catch (error) {
    handleError(res, error, 'Academic year');
  }
};

// DELETE /api/setup/academic-years/:id  (only when unused and not active)
export const deleteAcademicYear = async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 400, 'Invalid academic year id');

  try {
    const year = await prisma.academic_year.findFirst({
      where: { id: BigInt(req.params.id), school_id: req.schoolId },
    });
    if (!year) return fail(res, 404, 'Academic year not found');
    if (year.is_active) return fail(res, 409, 'Make another year active before deleting this one');

    const [leads, applications, admissions, fees] = await Promise.all([
      prisma.lead.count({ where: { academic_year_id: year.id } }),
      prisma.application.count({ where: { academic_year_id: year.id } }),
      prisma.admission.count({ where: { academic_year_id: year.id } }),
      prisma.fee_structure.count({ where: { academic_year_id: year.id } }),
    ]);
    if (leads + applications + admissions + fees > 0) {
      return fail(
        res,
        409,
        `This year is in use (${leads} leads, ${applications} applications, ${admissions} admissions, ${fees} fee structures) and cannot be deleted`
      );
    }

    await prisma.academic_year.delete({ where: { id: year.id } });
    res.status(200).json({ success: true, message: 'Academic year deleted' });
  } catch (error) {
    handleError(res, error, 'Academic year');
  }
};

/* ------------------------------------------------------------------ */
/* Classes                                                             */
/* ------------------------------------------------------------------ */

const validateClass = (body, existing = null) => {
  const class_name = body.class_name !== undefined ? text(body.class_name) : existing?.class_name;
  const rawOrder = body.class_numeric_value !== undefined ? body.class_numeric_value : existing?.class_numeric_value;
  const class_numeric_value = Number(rawOrder);

  if (!class_name) return { error: 'Class name is required' };
  if (class_name.length > 100) return { error: 'Class name must be 100 characters or fewer' };
  if (!Number.isInteger(class_numeric_value) || class_numeric_value < -5 || class_numeric_value > 20) {
    return { error: 'Order must be a whole number between -5 and 20 (for example 1 for Class 1, -2 for Nursery)' };
  }
  return {
    class_name,
    class_numeric_value,
    medium: body.medium !== undefined ? text(body.medium) || null : existing?.medium ?? null,
    description: body.description !== undefined ? text(body.description) || null : existing?.description ?? null,
  };
};

const validateSectionNames = (names) => {
  const list = (Array.isArray(names) ? names : []).map(text).filter(Boolean);
  if (list.some((n) => n.length > 50)) return { error: 'Section names must be 50 characters or fewer' };
  return { list: [...new Set(list)] };
};

// POST /api/setup/classes  { class_name, class_numeric_value, medium?, description?, sections?: ['A','B'] }
export const createClass = async (req, res) => {
  const checked = validateClass(req.body);
  if (checked.error) return fail(res, 400, checked.error);
  const sections = validateSectionNames(req.body.sections);
  if (sections.error) return fail(res, 400, sections.error);

  try {
    const created = await prisma.$transaction(async (tx) => {
      const schoolClass = await tx.school_class.create({
        data: { school_id: req.schoolId, ...checked },
      });
      for (const section_name of sections.list) {
        await tx.section.create({
          data: { school_id: req.schoolId, class_id: schoolClass.id, section_name },
        });
      }
      return schoolClass;
    });

    res.status(201).json({ success: true, message: 'Class added', data: serializeBigInt(created) });
  } catch (error) {
    handleError(res, error, 'A class with this name');
  }
};

// POST /api/setup/classes/bulk  { classes: [{ class_name, class_numeric_value }], sections: ['A'] }
// Adds several classes at once, skipping names the school already has.
export const createClassesBulk = async (req, res) => {
  const items = Array.isArray(req.body.classes) ? req.body.classes : [];
  if (!items.length) return fail(res, 400, 'Choose at least one class');
  if (items.length > 30) return fail(res, 400, 'Add at most 30 classes at a time');

  const checkedItems = [];
  for (const item of items) {
    const checked = validateClass(item);
    if (checked.error) return fail(res, 400, `${text(item?.class_name) || 'A class'}: ${checked.error}`);
    checkedItems.push(checked);
  }
  const sections = validateSectionNames(req.body.sections);
  if (sections.error) return fail(res, 400, sections.error);

  try {
    const existing = await prisma.school_class.findMany({
      where: { school_id: req.schoolId },
      select: { class_name: true },
    });
    const taken = new Set(existing.map((c) => c.class_name.toLowerCase()));
    const toCreate = checkedItems.filter((c) => !taken.has(c.class_name.toLowerCase()));

    await prisma.$transaction(async (tx) => {
      for (const item of toCreate) {
        const schoolClass = await tx.school_class.create({ data: { school_id: req.schoolId, ...item } });
        for (const section_name of sections.list) {
          await tx.section.create({
            data: { school_id: req.schoolId, class_id: schoolClass.id, section_name },
          });
        }
      }
    });

    res.status(201).json({
      success: true,
      message: `${toCreate.length} class(es) added${checkedItems.length > toCreate.length ? `, ${checkedItems.length - toCreate.length} already existed` : ''}`,
      data: { created: toCreate.map((c) => c.class_name), skipped: checkedItems.length - toCreate.length },
    });
  } catch (error) {
    handleError(res, error, 'One of these classes');
  }
};

// PATCH /api/setup/classes/:id
export const updateClass = async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 400, 'Invalid class id');

  try {
    const existing = await prisma.school_class.findFirst({
      where: { id: BigInt(req.params.id), school_id: req.schoolId },
    });
    if (!existing) return fail(res, 404, 'Class not found');

    const checked = validateClass(req.body, existing);
    if (checked.error) return fail(res, 400, checked.error);

    const updated = await prisma.school_class.update({
      where: { id: existing.id },
      data: { ...checked, updated_at: new Date() },
    });

    res.status(200).json({ success: true, message: 'Class updated', data: serializeBigInt(updated) });
  } catch (error) {
    handleError(res, error, 'A class with this name');
  }
};

// DELETE /api/setup/classes/:id  (only when no admissions or fee structures use it)
export const deleteClass = async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 400, 'Invalid class id');

  try {
    const existing = await prisma.school_class.findFirst({
      where: { id: BigInt(req.params.id), school_id: req.schoolId },
      select: { id: true, class_name: true },
    });
    if (!existing) return fail(res, 404, 'Class not found');

    const [admissions, fees] = await Promise.all([
      prisma.admission.count({ where: { class_id: existing.id } }),
      prisma.fee_structure.count({ where: { class_id: existing.id } }),
    ]);
    if (admissions + fees > 0) {
      return fail(res, 409, `${existing.class_name} is in use (${admissions} admissions, ${fees} fee structures) and cannot be deleted`);
    }

    // Its (unused) sections go with it
    await prisma.$transaction([
      prisma.section.deleteMany({ where: { class_id: existing.id, school_id: req.schoolId } }),
      prisma.school_class.delete({ where: { id: existing.id } }),
    ]);

    res.status(200).json({ success: true, message: 'Class deleted' });
  } catch (error) {
    handleError(res, error, 'Class');
  }
};

/* ------------------------------------------------------------------ */
/* Sections                                                            */
/* ------------------------------------------------------------------ */

const validateSection = (body, existing = null) => {
  const section_name = body.section_name !== undefined ? text(body.section_name) : existing?.section_name;
  const rawCapacity = body.capacity !== undefined && body.capacity !== '' ? body.capacity : existing?.capacity ?? 60;
  const capacity = Number(rawCapacity);

  if (!section_name) return { error: 'Section name is required' };
  if (section_name.length > 50) return { error: 'Section name must be 50 characters or fewer' };
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 500) {
    return { error: 'Capacity must be a whole number from 1 to 500' };
  }
  return {
    section_name,
    capacity,
    class_teacher: body.class_teacher !== undefined ? text(body.class_teacher) || null : existing?.class_teacher ?? null,
  };
};

// POST /api/setup/classes/:id/sections  { section_name, capacity?, class_teacher? }
export const createSection = async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 400, 'Invalid class id');
  const checked = validateSection(req.body);
  if (checked.error) return fail(res, 400, checked.error);

  try {
    const schoolClass = await prisma.school_class.findFirst({
      where: { id: BigInt(req.params.id), school_id: req.schoolId },
      select: { id: true },
    });
    if (!schoolClass) return fail(res, 404, 'Class not found');

    const created = await prisma.section.create({
      data: { school_id: req.schoolId, class_id: schoolClass.id, ...checked },
    });

    res.status(201).json({ success: true, message: 'Section added', data: serializeBigInt(created) });
  } catch (error) {
    handleError(res, error, 'A section with this name in this class');
  }
};

// PATCH /api/setup/sections/:id
export const updateSection = async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 400, 'Invalid section id');

  try {
    const existing = await prisma.section.findFirst({
      where: { id: BigInt(req.params.id), school_id: req.schoolId },
    });
    if (!existing) return fail(res, 404, 'Section not found');

    const checked = validateSection(req.body, existing);
    if (checked.error) return fail(res, 400, checked.error);

    const updated = await prisma.section.update({
      where: { id: existing.id },
      data: { ...checked, updated_at: new Date() },
    });

    res.status(200).json({ success: true, message: 'Section updated', data: serializeBigInt(updated) });
  } catch (error) {
    handleError(res, error, 'A section with this name in this class');
  }
};

// DELETE /api/setup/sections/:id  (only when no admissions use it)
export const deleteSection = async (req, res) => {
  if (!isId(req.params.id)) return fail(res, 400, 'Invalid section id');

  try {
    const existing = await prisma.section.findFirst({
      where: { id: BigInt(req.params.id), school_id: req.schoolId },
      select: { id: true, section_name: true },
    });
    if (!existing) return fail(res, 404, 'Section not found');

    const admissions = await prisma.admission.count({ where: { section_id: existing.id } });
    if (admissions > 0) {
      return fail(res, 409, `Section ${existing.section_name} has ${admissions} admissions and cannot be deleted`);
    }

    await prisma.section.delete({ where: { id: existing.id } });
    res.status(200).json({ success: true, message: 'Section deleted' });
  } catch (error) {
    handleError(res, error, 'Section');
  }
};
