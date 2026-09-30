/**
 * controllers/pipelineController.js
 *
 * Admission pipeline for the caller's school, derived from real data:
 * lead status -> campus visit -> application status -> completed admission.
 *
 *   GET   /api/pipeline                   columns with counts and up to 50 leads each
 *   PATCH /api/pipeline/leads/:id/stage   { stage } move a lead between the
 *                                         status-only stages (new, contacted,
 *                                         interested, lost)
 */
import prisma from '../src/lib/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const PER_COLUMN = 50;

export const PIPELINE_STAGES = [
  { id: 'new', title: 'New Inquiry', color: '#f0f4f8', movable: true },
  { id: 'contacted', title: 'Contacted', color: '#eff6ff', movable: true },
  { id: 'interested', title: 'Interested', color: '#f0fdf4', movable: true },
  { id: 'campus_visit', title: 'Campus Visit', color: '#faf5ff', movable: false },
  { id: 'application_started', title: 'Application Started', color: '#fff7ed', movable: false },
  { id: 'submitted', title: 'Submitted', color: '#f0fdfa', movable: false },
  { id: 'approved', title: 'Approved', color: '#ecfdf5', movable: false },
  { id: 'enrolled', title: 'Enrolled', color: '#dcfce7', movable: false },
  { id: 'rejected', title: 'Rejected / Lost', color: '#fff1f2', movable: true },
];

// Status written when a lead is dropped on a status-only stage
const STAGE_TO_STATUS = { new: 'new', contacted: 'contacted', interested: 'interested', rejected: 'lost' };
const LOST = new Set(['lost', 'not-interested', 'not_interested', 'inactive']);
// Order of progress, for "reached this stage or later"
const PROGRESS = ['new', 'contacted', 'interested', 'campus_visit', 'application_started', 'submitted', 'approved', 'enrolled'];

const stageFor = (lead, apps, hasVisit, enrolled) => {
  if (enrolled) return 'enrolled';
  const statuses = apps.map((a) => a.status);
  if (statuses.includes('admission_completed')) return 'enrolled';
  if (statuses.some((s) => ['approved', 'admission_started'].includes(s))) return 'approved';
  if (statuses.some((s) => ['submitted', 'under_review', 'documents_pending'].includes(s))) return 'submitted';
  if (statuses.some((s) => ['draft', 'in_progress'].includes(s))) return 'application_started';
  if (statuses.length && statuses.every((s) => s === 'rejected')) return 'rejected';
  const status = String(lead.follow_up_status || '').toLowerCase();
  if (LOST.has(status)) return 'rejected';
  if (hasVisit) return 'campus_visit';
  if (['interested', 'qualified'].includes(status)) return 'interested';
  if (['admitted', 'converted'].includes(status)) return 'enrolled';
  if (status === 'contacted') return 'contacted';
  return 'new';
};

const relative = (date) => {
  if (!date) return '';
  const days = Math.floor((Date.now() - new Date(date).getTime()) / DAY_MS);
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

export const getPipeline = async (req, res) => {
  try {
    const school = req.schoolId;
    const [leads, applications, visits, admissions, users] = await Promise.all([
      prisma.lead.findMany({
        where: { school_id: school },
        select: {
          id: true, first_name: true, last_name: true, desired_class: true, follow_up_status: true,
          assigned_to: true, created_at: true, updated_at: true, last_contacted_at: true,
        },
      }),
      prisma.application.findMany({
        where: { school_id: school, lead_id: { not: null } },
        select: { id: true, lead_id: true, status: true, application_number: true },
      }),
      prisma.campus_visit.findMany({
        where: { school_id: school, lead_id: { not: null }, NOT: { status: { in: ['cancelled', 'no_show'] } } },
        select: { lead_id: true },
      }),
      prisma.admission.findMany({
        where: { school_id: school, is_completed: true },
        select: { lead_id: true, application_id: true },
      }),
      prisma.app_user.findMany({ where: { school_id: school }, select: { id: true, name: true } }),
    ]);

    const appsByLead = new Map();
    const appLead = new Map();
    for (const a of applications) {
      const key = String(a.lead_id);
      appLead.set(String(a.id), key);
      if (!appsByLead.has(key)) appsByLead.set(key, []);
      appsByLead.get(key).push(a);
    }
    const visited = new Set(visits.map((v) => String(v.lead_id)));
    const enrolledLeads = new Set(
      admissions.map((a) => (a.lead_id ? String(a.lead_id) : appLead.get(String(a.application_id)))).filter(Boolean)
    );
    const userName = new Map(users.map((u) => [String(u.id), u.name]));

    const columns = new Map(PIPELINE_STAGES.map((s) => [s.id, []]));
    let openDays = 0;
    let openCount = 0;
    for (const lead of leads) {
      const key = String(lead.id);
      const apps = appsByLead.get(key) || [];
      const stage = stageFor(lead, apps, visited.has(key), enrolledLeads.has(key));
      const lastActivity = lead.last_contacted_at || lead.updated_at || lead.created_at;
      const inactiveDays = lastActivity ? Math.floor((Date.now() - new Date(lastActivity).getTime()) / DAY_MS) : 0;
      if (!['enrolled', 'rejected'].includes(stage) && lead.created_at) {
        openDays += (Date.now() - new Date(lead.created_at).getTime()) / DAY_MS;
        openCount += 1;
      }
      columns.get(stage).push({
        id: key,
        name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
        grade: lead.desired_class || '',
        counselor: userName.get(String(lead.assigned_to)) || (lead.assigned_to && !/^\d+$/.test(lead.assigned_to) ? lead.assigned_to : 'Unassigned'),
        application_number: apps[0]?.application_number || null,
        last_activity: relative(lastActivity),
        last_activity_at: lastActivity,
        inactive_days: inactiveDays,
      });
    }

    const total = leads.length;
    const reached = (stageId) => {
      const idx = PROGRESS.indexOf(stageId);
      if (idx === -1) return columns.get(stageId).length;
      return PROGRESS.slice(idx).reduce((n, id) => n + columns.get(id).length, 0);
    };

    res.json({
      success: true,
      data: {
        total_leads: total,
        conversion_rate: total ? Math.round((columns.get('enrolled').length / total) * 1000) / 10 : 0,
        avg_days_open: openCount ? Math.round(openDays / openCount) : 0,
        columns: PIPELINE_STAGES.map((stage) => {
          const list = columns
            .get(stage.id)
            .sort((a, b) => new Date(b.last_activity_at || 0) - new Date(a.last_activity_at || 0));
          return {
            ...stage,
            count: list.length,
            // Share of all leads that reached this stage or a later one
            reached_pct: total && stage.id !== 'rejected' ? Math.round((reached(stage.id) / total) * 100) : null,
            leads: list.slice(0, PER_COLUMN),
          };
        }),
      },
    });
  } catch (error) {
    console.error('Pipeline error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load the pipeline' });
  }
};

export const moveLeadStage = async (req, res) => {
  const status = STAGE_TO_STATUS[req.body?.stage];
  if (!/^\d+$/.test(String(req.params.id || ''))) {
    return res.status(400).json({ success: false, message: 'Invalid lead id' });
  }
  if (!status) {
    return res.status(400).json({
      success: false,
      message: 'Leads can be moved only between New Inquiry, Contacted, Interested and Rejected / Lost. Later stages follow the application.',
    });
  }
  try {
    const lead = await prisma.lead.findFirst({
      where: { id: BigInt(req.params.id), school_id: req.schoolId },
      select: { id: true },
    });
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const activeApplication = await prisma.application.findFirst({
      where: { school_id: req.schoolId, lead_id: lead.id, NOT: { status: 'rejected' } },
      select: { id: true },
    });
    if (activeApplication) {
      return res.status(409).json({ success: false, message: 'This lead has an application; its stage follows the application.' });
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        follow_up_status: status,
        updated_at: new Date(),
        ...(status === 'contacted' && { last_contacted_at: new Date() }),
      },
    });
    res.json({ success: true, message: 'Lead moved', data: { id: String(lead.id), follow_up_status: status } });
  } catch (error) {
    console.error('Move lead stage error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to move the lead' });
  }
};
