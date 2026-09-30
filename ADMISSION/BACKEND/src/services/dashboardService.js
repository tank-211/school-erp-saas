/**
 * src/services/dashboardService.js
 *
 * Dashboard and Reports figures for ONE school (the caller's, from the token).
 * Every function takes the school id and an optional period:
 *   week | month | quarter | year | all   (India calendar; "all" = no start)
 */
import prisma from '../lib/prisma.js';

const DAY_MS = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 330 * 60 * 1000;

// Lead statuses (LEAD module vocabulary) that still need work
const OPEN_LEAD_STATUSES = ['new', 'pending', 'contacted', 'interested', 'qualified'];
const CLOSED_LEAD_STATUSES = ['admitted', 'converted', 'lost', 'inactive', 'not-interested', 'not_interested'];
// Payments that did not bring money in
const NOT_COLLECTED = ['cancelled', 'failed', 'refunded'];

/** Today's India calendar date as { y, m (0-11), d }. */
const indiaToday = (now = new Date()) => {
  const shifted = new Date(now.getTime() + IST_OFFSET_MS);
  return { y: shifted.getUTCFullYear(), m: shifted.getUTCMonth(), d: shifted.getUTCDate(), dow: shifted.getUTCDay() };
};
/** Midnight India time of the given India date, as a UTC instant. */
const indiaMidnight = (y, m, d) => new Date(Date.UTC(y, m, d) - IST_OFFSET_MS);

/** Start instant of a reporting period, or null for "all". */
export const periodStart = (period, now = new Date()) => {
  const { y, m, d, dow } = indiaToday(now);
  switch (period) {
    case 'week': return indiaMidnight(y, m, d - ((dow + 6) % 7)); // Monday
    case 'month': return indiaMidnight(y, m, 1);
    case 'quarter': return indiaMidnight(y, m - (m % 3), 1);
    case 'year': return indiaMidnight(y, 0, 1);
    default: return null;
  }
};

const sid = (schoolId) => BigInt(schoolId);
const since = (field, start) => (start ? { [field]: { gte: start } } : {});

/** "+12%" / "-5%" / "0%"; null when there is no previous figure to compare. */
const change = (current, previous) => {
  if (!previous) return current ? null : '0%';
  const pct = Math.round(((current - previous) / previous) * 100);
  return `${pct >= 0 ? '+' : ''}${pct}%`;
};

/** This month and last month, India calendar. */
const monthWindows = (now = new Date()) => {
  const { y, m } = indiaToday(now);
  return {
    thisStart: indiaMidnight(y, m, 1),
    lastStart: indiaMidnight(y, m - 1, 1),
  };
};

const collectedAmount = async (schoolId, from, to) => {
  const agg = await prisma.payment.aggregate({
    _sum: { amount: true },
    where: {
      school_id: sid(schoolId),
      NOT: { status: { in: NOT_COLLECTED } },
      ...(from || to ? { payment_date: { ...(from && { gte: from }), ...(to && { lt: to }) } } : {}),
    },
  });
  return Number(agg._sum.amount || 0);
};

const dashboardService = {
  /**
   * Headline cards. Values are for the period; the *Change fields compare
   * this calendar month with last month (null when there is nothing to compare).
   */
  async getStats(schoolId, period = 'all') {
    const school = sid(schoolId);
    const start = periodStart(period);
    const { thisStart, lastStart } = monthWindows();

    const [
      totalInquiries,
      leadsWithApplication,
      activeLeads,
      enrolledStudents,
      pendingApplications,
      approvedApplications,
      feesCollected,
      inquiriesThisMonth,
      inquiriesLastMonth,
      enrolledThisMonth,
      enrolledLastMonth,
      feesThisMonth,
      feesLastMonth,
    ] = await Promise.all([
      prisma.lead.count({ where: { school_id: school, ...since('created_at', start) } }),
      prisma.application.findMany({
        where: { school_id: school, lead_id: { not: null }, ...(start && { lead: { created_at: { gte: start } } }) },
        select: { lead_id: true },
        distinct: ['lead_id'],
      }),
      prisma.lead.count({ where: { school_id: school, follow_up_status: { in: OPEN_LEAD_STATUSES } } }),
      prisma.admission.count({ where: { school_id: school, is_completed: true, ...since('admission_date', start) } }),
      prisma.application.count({ where: { school_id: school, status: { in: ['submitted', 'under_review'] } } }),
      prisma.application.count({ where: { school_id: school, status: 'approved', ...since('updated_at', start) } }),
      collectedAmount(schoolId, start, null),
      prisma.lead.count({ where: { school_id: school, created_at: { gte: thisStart } } }),
      prisma.lead.count({ where: { school_id: school, created_at: { gte: lastStart, lt: thisStart } } }),
      prisma.admission.count({ where: { school_id: school, is_completed: true, admission_date: { gte: thisStart } } }),
      prisma.admission.count({ where: { school_id: school, is_completed: true, admission_date: { gte: lastStart, lt: thisStart } } }),
      collectedAmount(schoolId, thisStart, null),
      collectedAmount(schoolId, lastStart, thisStart),
    ]);

    const converted = new Set(leadsWithApplication.map((a) => String(a.lead_id))).size;
    const conversionRate = totalInquiries ? Math.round((converted / totalInquiries) * 1000) / 10 : 0;

    return {
      period,
      totalInquiries,
      totalInquiriesChange: change(inquiriesThisMonth, inquiriesLastMonth),
      conversionRate,
      conversionRateChange: null,
      activeLeads,
      activeLeadsChange: null,
      enrolledStudents,
      enrolledStudentsChange: change(enrolledThisMonth, enrolledLastMonth),
      pendingApplications,
      pendingApplicationsChange: null,
      // Approved applications waiting for admission. Offer letters are tracked
      // separately once admission offers exist.
      offersSent: approvedApplications,
      offersSentChange: null,
      feesCollected,
      feesCollectedChange: change(feesThisMonth, feesLastMonth),
    };
  },

  /**
   * Cumulative funnel: a lead counts in every stage it has reached, so a lead
   * that enrolled also counts as contacted, interested, visited and applied.
   */
  async getFunnel(schoolId, period = 'all') {
    const school = sid(schoolId);
    const start = periodStart(period);

    const leads = await prisma.lead.findMany({
      where: { school_id: school, ...since('created_at', start) },
      select: { id: true, follow_up_status: true, last_contacted_at: true },
    });
    const ids = leads.map((l) => l.id);
    if (!ids.length) {
      return { inquiry: 0, contacted: 0, interested: 0, visit: 0, applied: 0, enrolled: 0 };
    }

    const [visits, applications, admissions] = await Promise.all([
      prisma.campus_visit.findMany({
        where: { school_id: school, lead_id: { in: ids }, NOT: { status: { in: ['cancelled', 'no_show'] } } },
        select: { lead_id: true },
      }),
      prisma.application.findMany({
        where: { school_id: school, lead_id: { in: ids } },
        select: { id: true, lead_id: true },
      }),
      prisma.admission.findMany({
        where: { school_id: school, is_completed: true, OR: [{ lead_id: { in: ids } }, { application: { lead_id: { in: ids } } }] },
        select: { lead_id: true, application_id: true },
      }),
    ]);

    const appLead = new Map(applications.map((a) => [String(a.id), String(a.lead_id)]));
    const visited = new Set(visits.map((v) => String(v.lead_id)));
    const applied = new Set(applications.map((a) => String(a.lead_id)));
    const enrolled = new Set(
      admissions
        .map((a) => (a.lead_id ? String(a.lead_id) : appLead.get(String(a.application_id))))
        .filter(Boolean)
    );

    const counts = { inquiry: leads.length, contacted: 0, interested: 0, visit: 0, applied: 0, enrolled: 0 };
    for (const lead of leads) {
      const key = String(lead.id);
      const status = String(lead.follow_up_status || '').toLowerCase();
      const isEnrolled = enrolled.has(key) || ['admitted', 'converted'].includes(status);
      const isApplied = isEnrolled || applied.has(key);
      const isVisited = isApplied || visited.has(key);
      const isInterested = isVisited || ['interested', 'qualified'].includes(status);
      const isContacted = isInterested || Boolean(lead.last_contacted_at) || !['new', 'pending', ''].includes(status);
      if (isContacted) counts.contacted += 1;
      if (isInterested) counts.interested += 1;
      if (isVisited) counts.visit += 1;
      if (isApplied) counts.applied += 1;
      if (isEnrolled) counts.enrolled += 1;
    }
    return counts;
  },

  /** Inquiries and completed admissions per month (India calendar). */
  async getMonthlyTrend(schoolId, period = 'all') {
    const school = sid(schoolId);
    const monthsBack = { quarter: 3, year: 12 }[period] || 6;
    const { y, m } = indiaToday();
    const months = Array.from({ length: monthsBack }, (_, i) => {
      const idx = m - (monthsBack - 1 - i);
      return { start: indiaMidnight(y, idx, 1), end: indiaMidnight(y, idx + 1, 1), date: new Date(Date.UTC(y, idx, 1)) };
    });
    const from = months[0].start;

    const [leads, admissions] = await Promise.all([
      prisma.lead.findMany({ where: { school_id: school, created_at: { gte: from } }, select: { created_at: true } }),
      prisma.admission.findMany({
        where: { school_id: school, is_completed: true, admission_date: { gte: from } },
        select: { admission_date: true },
      }),
    ]);

    const inMonth = (value, month) => {
      if (!value) return false;
      const t = new Date(value).getTime();
      return t >= month.start.getTime() && t < month.end.getTime();
    };
    return months.map((month) => ({
      month: month.date.toLocaleString('en-US', { month: 'short', timeZone: 'UTC' }),
      year: month.date.getUTCFullYear(),
      inquiries: leads.filter((l) => inMonth(l.created_at, month)).length,
      enrollments: admissions.filter((a) => inMonth(a.admission_date, month)).length,
    }));
  },

  /** Completed admissions per class. */
  async getGradeDistribution(schoolId, period = 'all') {
    const school = sid(schoolId);
    const start = periodStart(period);
    const [classes, admissions] = await Promise.all([
      prisma.school_class.findMany({
        where: { school_id: school },
        select: { id: true, class_name: true, class_numeric_value: true },
        orderBy: [{ class_numeric_value: 'asc' }, { class_name: 'asc' }],
      }),
      prisma.admission.findMany({
        where: { school_id: school, is_completed: true, ...since('admission_date', start) },
        select: { class_id: true },
      }),
    ]);
    const counts = new Map();
    for (const a of admissions) counts.set(String(a.class_id), (counts.get(String(a.class_id)) || 0) + 1);
    return classes
      .filter((c) => counts.get(String(c.id)))
      .map((c) => ({ label: c.class_name, value: counts.get(String(c.id)) }));
  },

  /** Leads assigned to each counselor/admin and how many reached an application. */
  async getCounselorPerformance(schoolId, period = 'all') {
    const school = sid(schoolId);
    const start = periodStart(period);
    const [users, leads, applications] = await Promise.all([
      prisma.app_user.findMany({
        where: { school_id: school, status: 'active', role: { in: ['counselor', 'admin'] } },
        select: { id: true, name: true },
      }),
      prisma.lead.findMany({
        where: { school_id: school, assigned_to: { not: null }, ...since('created_at', start) },
        select: { id: true, assigned_to: true },
      }),
      prisma.application.findMany({
        where: { school_id: school, lead_id: { not: null } },
        select: { lead_id: true },
        distinct: ['lead_id'],
      }),
    ]);
    const converted = new Set(applications.map((a) => String(a.lead_id)));
    return users
      .map((user) => {
        // lead.assigned_to holds the user id as text (older rows may hold the name)
        const mine = leads.filter((l) => [String(user.id), String(user.name || '')].includes(String(l.assigned_to)));
        if (!mine.length) return null;
        const conversions = mine.filter((l) => converted.has(String(l.id))).length;
        return {
          id: String(user.id),
          name: user.name,
          leads: mine.length,
          conversions,
          pct: Math.round((conversions / mine.length) * 100),
        };
      })
      .filter(Boolean)
      .sort((a, b) => b.pct - a.pct || b.conversions - a.conversions || b.leads - a.leads)
      .slice(0, 8);
  },

  /**
   * Open leads with no contact for `days` or more (last contact, else last
   * update, else creation), oldest first.
   */
  async getInactivityAlerts(schoolId, days = 7, limit = 10) {
    const cutoff = new Date(Date.now() - days * DAY_MS);
    const leads = await prisma.lead.findMany({
      where: {
        school_id: sid(schoolId),
        NOT: { follow_up_status: { in: CLOSED_LEAD_STATUSES } },
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        desired_class: true,
        follow_up_status: true,
        inactivity_reason: true,
        last_contacted_at: true,
        updated_at: true,
        created_at: true,
      },
    });
    return leads
      .map((l) => {
        const last = l.last_contacted_at || l.updated_at || l.created_at;
        const idle = last ? Math.floor((Date.now() - new Date(last).getTime()) / DAY_MS) : null;
        return { lead: l, last, idle };
      })
      .filter((x) => x.last && new Date(x.last) <= cutoff)
      .sort((a, b) => new Date(a.last) - new Date(b.last))
      .slice(0, limit)
      .map(({ lead, last, idle }) => ({
        lead_id: String(lead.id),
        name: [lead.first_name, lead.last_name].filter(Boolean).join(' '),
        grade: lead.desired_class || null,
        status: lead.follow_up_status || 'new',
        reason:
          lead.inactivity_reason ||
          (lead.last_contacted_at ? `No contact for ${idle} days` : `Not contacted since added ${idle} days ago`),
        last_activity_at: last,
        days_inactive: idle,
      }));
  },
};

export default dashboardService;
