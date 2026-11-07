import prisma from '../src/lib/prisma.js';

const serialize = (row) => JSON.parse(JSON.stringify(row, (_, value) => typeof value === 'bigint' ? value.toString() : value));
const validId = (value) => /^\d+$/.test(String(value || '')) && BigInt(String(value)) > 0n;
const allowedTypes = new Set(['lead', 'application', 'admission', 'student']);

async function validateRelatedRecord(type, id, schoolId) {
  if (!type && !id) return true;
  if (!allowedTypes.has(type) || !validId(id)) return false;
  const models = { lead: prisma.lead, application: prisma.application, admission: prisma.admission, student: prisma.student };
  const record = await models[type].findFirst({ where: { id: BigInt(id), school_id: schoolId }, select: { id: true } });
  return Boolean(record);
}

export const listAdmissionTasks = async (req, res, next) => {
  try {
    const rows = await prisma.task.findMany({
      where: { school_id: req.schoolId },
      orderBy: [{ is_done: 'asc' }, { due_date: 'asc' }, { created_at: 'desc' }],
      take: 200,
    });
    res.json({ success: true, data: serialize(rows) });
  } catch (error) { next(error); }
};

export const createAdmissionTask = async (req, res, next) => {
  try {
    const { title, task_description, assigned_to, priority = 'medium', due_date, related_entity_type, related_entity_id } = req.body || {};
    if (!String(title || '').trim()) return res.status(400).json({ success: false, message: 'Task title is required.' });
    if (!['low', 'medium', 'high', 'urgent'].includes(priority)) return res.status(400).json({ success: false, message: 'Invalid task priority.' });
    if (related_entity_type || related_entity_id) {
      const exists = await validateRelatedRecord(related_entity_type, related_entity_id, req.schoolId);
      if (!exists) return res.status(400).json({ success: false, message: 'Related record was not found in this school.' });
    }
    const assigneeId = assigned_to && validId(assigned_to) ? BigInt(assigned_to) : BigInt(req.user.id);
    const assignee = await prisma.app_user.findFirst({ where: { id: assigneeId, school_id: req.schoolId, status: 'active' }, select: { id: true } });
    if (!assignee) return res.status(400).json({ success: false, message: 'Assignee must be an active user in this school.' });
    const row = await prisma.task.create({ data: {
      school_id: req.schoolId, assigned_to: assigneeId, title: String(title).trim(),
      task_description: task_description ? String(task_description).trim() : null,
      priority, status: 'pending', is_done: false,
      due_date: due_date ? new Date(due_date) : null,
      related_entity_type: related_entity_type || null,
      related_entity_id: related_entity_id ? BigInt(related_entity_id) : null,
    }});
    res.status(201).json({ success: true, data: serialize(row) });
  } catch (error) { next(error); }
};

export const updateAdmissionTask = async (req, res, next) => {
  try {
    if (!validId(req.params.id)) return res.status(400).json({ success: false, message: 'Invalid task ID.' });
    const existing = await prisma.task.findFirst({ where: { id: BigInt(req.params.id), school_id: req.schoolId } });
    if (!existing) return res.status(404).json({ success: false, message: 'Task not found.' });
    const { title, task_description, priority, status, due_date, assigned_to } = req.body || {};
    if (priority !== undefined && !['low', 'medium', 'high', 'urgent'].includes(priority)) return res.status(400).json({ success: false, message: 'Invalid task priority.' });
    if (status !== undefined && !['pending', 'in_progress', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ success: false, message: 'Invalid task status.' });
    const data = {};
    if (title !== undefined) data.title = String(title).trim();
    if (task_description !== undefined) data.task_description = task_description;
    if (priority !== undefined) data.priority = priority;
    if (status !== undefined) { data.status = status; data.is_done = status === 'completed'; }
    if (due_date !== undefined) data.due_date = due_date ? new Date(due_date) : null;
    if (assigned_to !== undefined) {
      if (!validId(assigned_to)) return res.status(400).json({ success: false, message: 'Invalid assignee.' });
      const assignee = await prisma.app_user.findFirst({ where: { id: BigInt(assigned_to), school_id: req.schoolId, status: 'active' }, select: { id: true } });
      if (!assignee) return res.status(400).json({ success: false, message: 'Assignee must belong to this school.' });
      data.assigned_to = BigInt(assigned_to);
    }
    const row = await prisma.task.update({ where: { id: existing.id }, data });
    res.json({ success: true, data: serialize(row) });
  } catch (error) { next(error); }
};
