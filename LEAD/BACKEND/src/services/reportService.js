import prisma from "../prisma/index.js";
import AppError from "../utils/AppError.js";

/**
 * Reports built from the school's own records. Every query is scoped to the
 * caller's school. Money comes from the invoice and payment tables shared
 * with the ADMISSION and FEES apps.
 */

const DAY = 24 * 60 * 60 * 1000;
const INDIA = "Asia/Kolkata";

// Activities the system records on its own; they are not contact with a family
const SYSTEM_ACTIVITY = new Set(["LEAD_CREATED", "LEAD_UPDATED", "LEAD_ASSIGNED", "STAGE_CHANGED"]);

const monthKey = (date) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: INDIA, year: "numeric", month: "2-digit" }).format(new Date(date)); // YYYY-MM
const monthLabel = (key) => {
  const [y, m] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 15)).toLocaleString("en-IN", { month: "short", year: "2-digit", timeZone: "UTC" });
};
const monthsBetween = (start, end) => {
  const keys = [];
  const [sy, sm] = monthKey(start).split("-").map(Number);
  const [ey, em] = monthKey(end).split("-").map(Number);
  for (let y = sy, m = sm; y < ey || (y === ey && m <= em); m === 12 ? (y++, (m = 1)) : m++) {
    keys.push(`${y}-${String(m).padStart(2, "0")}`);
  }
  return keys;
};
const paise = (value) => Math.round(Number(value || 0) * 100);
const rupees = (p) => Math.round(p) / 100;
const pct = (part, whole) => (whole ? Math.round((part / whole) * 1000) / 10 : null);
const isId = (value) => /^\d+$/.test(String(value ?? ""));


const pickYear = async (sid, academicYearId) => {
  const years = await prisma.academic_year.findMany({
    where: { school_id: sid },
    select: { id: true, year_name: true, start_date: true, end_date: true, is_active: true, status: true },
    orderBy: { start_date: "desc" },
  });
  let year = null;
  if (academicYearId !== undefined && academicYearId !== "") {
    if (!isId(academicYearId)) throw new AppError("Invalid academic year", 400);
    year = years.find((y) => String(y.id) === String(academicYearId));
    if (!year) throw new AppError("Academic year not found", 404);
  } else {
    year = years.find((y) => y.is_active || y.status === "active") || years[0] || null;
  }
  return { year, years };
};

const yearList = (years) =>
  years.map((y) => ({ id: String(y.id), name: y.year_name, is_active: Boolean(y.is_active || y.status === "active") }));

/* ------------------------------------------------------------------ */
/* Sales (fee collection)                                              */
/* ------------------------------------------------------------------ */

export const getSalesReport = async (schoolId, { academicYearId } = {}) => {
  const sid = BigInt(schoolId);
  const { year, years } = await pickYear(sid, academicYearId);
  if (!year) {
    return { academic_year: null, academic_years: [], empty: true };
  }

  const start = new Date(year.start_date);
  const end = new Date(new Date(year.end_date).getTime() + DAY - 1);
  const today = new Date();

  const [payments, invoices, admissions, classes] = await Promise.all([
    prisma.payment.findMany({
      where: { school_id: sid, payment_date: { gte: start, lte: end }, status: { not: "cancelled" } },
      select: { amount: true, payment_date: true, student_id: true },
    }),
    prisma.invoice.findMany({
      where: { school_id: sid, invoice_date: { gte: start, lte: end }, status: { not: "cancelled" } },
      select: { total_amount: true, paid_amount: true, pending_amount: true, due_date: true, invoice_date: true, student_id: true },
    }),
    prisma.admission.findMany({
      where: { school_id: sid, academic_year_id: year.id },
      select: { id: true, student_id: true, class_id: true, lead_id: true, status: true, is_completed: true, created_at: true },
    }),
    prisma.school_class.findMany({ where: { school_id: sid }, select: { id: true, class_name: true, class_numeric_value: true } }),
  ]);

  // Where each student's money is attributed: their admission this year
  const leadIds = [...new Set(admissions.map((a) => a.lead_id).filter(Boolean).map(String))];
  const leads = leadIds.length
    ? await prisma.lead.findMany({ where: { school_id: sid, id: { in: leadIds.map(BigInt) } }, select: { id: true, source: true } })
    : [];
  const sourceByLead = new Map(leads.map((l) => [String(l.id), l.source || "Unknown"]));
  const admissionByStudent = new Map(admissions.map((a) => [String(a.student_id), a]));
  const className = new Map(classes.map((c) => [String(c.id), c.class_name]));
  const classOrder = new Map(classes.map((c) => [c.class_name, c.class_numeric_value ?? 0]));

  // Monthly: billed (invoices raised) against collected (payments received)
  const lastMonth = today < end ? today : end;
  const months = monthsBetween(start, lastMonth < start ? start : lastMonth);
  const monthly = new Map(months.map((k) => [k, { billed: 0, collected: 0 }]));
  for (const inv of invoices) {
    const m = monthly.get(monthKey(inv.invoice_date));
    if (m) m.billed += paise(inv.total_amount);
  }
  for (const pay of payments) {
    const m = monthly.get(monthKey(pay.payment_date));
    if (m) m.collected += paise(pay.amount);
  }

  const byClass = new Map();
  const bySource = new Map();
  for (const pay of payments) {
    const adm = admissionByStudent.get(String(pay.student_id));
    const cls = adm ? className.get(String(adm.class_id)) || "Unassigned" : "Not admitted this year";
    const src = adm?.lead_id ? sourceByLead.get(String(adm.lead_id)) || "Unknown" : "Direct / unknown";
    byClass.set(cls, (byClass.get(cls) || 0) + paise(pay.amount));
    const s = bySource.get(src) || { amount: 0, students: new Set() };
    s.amount += paise(pay.amount);
    s.students.add(String(pay.student_id));
    bySource.set(src, s);
  }

  const collected = payments.reduce((t, p) => t + paise(p.amount), 0);
  const billed = invoices.reduce((t, i) => t + paise(i.total_amount), 0);

  // Invoice status, derived from the amounts and due date
  const status = { paid: { count: 0, amount: 0 }, partial: { count: 0, amount: 0 }, unpaid: { count: 0, amount: 0 }, overdue: { count: 0, amount: 0 } };
  for (const inv of invoices) {
    const pending = paise(inv.pending_amount);
    const paid = paise(inv.paid_amount);
    let key = "paid";
    if (pending > 0) {
      if (inv.due_date && new Date(inv.due_date) < new Date(today.toDateString())) key = "overdue";
      else key = paid > 0 ? "partial" : "unpaid";
    }
    status[key].count += 1;
    status[key].amount += key === "paid" ? paise(inv.total_amount) : pending;
  }

  // Quarters of the academic year: new admissions and money collected
  const quarters = [0, 1, 2, 3].map((q) => {
    const qs = new Date(start.getTime());
    qs.setUTCMonth(qs.getUTCMonth() + q * 3);
    const qe = new Date(qs.getTime());
    qe.setUTCMonth(qe.getUTCMonth() + 3);
    return {
      label: `Q${q + 1} (${monthLabel(monthKey(qs))} – ${monthLabel(monthKey(new Date(qe.getTime() - DAY)))})`,
      admissions: admissions.filter((a) => a.created_at && new Date(a.created_at) >= qs && new Date(a.created_at) < qe).length,
      collected: rupees(payments.filter((p) => new Date(p.payment_date) >= qs && new Date(p.payment_date) < qe).reduce((t, p) => t + paise(p.amount), 0)),
    };
  });

  // Previous academic year, for growth
  const previous = years.find((y) => new Date(y.end_date) < start);
  let growth = null;
  if (previous) {
    const prev = await prisma.payment.aggregate({
      where: {
        school_id: sid,
        payment_date: { gte: new Date(previous.start_date), lte: new Date(new Date(previous.end_date).getTime() + DAY - 1) },
        status: { not: "cancelled" },
      },
      _sum: { amount: true },
    });
    const prevPaise = paise(prev._sum.amount);
    growth = prevPaise ? pct(collected - prevPaise, prevPaise) : null;
  }

  return {
    academic_year: { id: String(year.id), name: year.year_name },
    academic_years: yearList(years),
    stats: {
      collected: rupees(collected),
      billed: rupees(billed),
      collection_rate: pct(collected, billed),
      enrolled_students: admissions.filter((a) => a.is_completed || a.status === "active").length,
      growth_vs_previous_year: growth,
      previous_year: previous ? previous.year_name : null,
    },
    monthly: months.map((k) => ({ month: monthLabel(k), billed: rupees(monthly.get(k).billed), collected: rupees(monthly.get(k).collected) })),
    by_class: [...byClass.entries()]
      .map(([name, amount]) => ({ name, collected: rupees(amount) }))
      .sort((a, b) => (classOrder.get(a.name) ?? 99) - (classOrder.get(b.name) ?? 99)),
    by_source: [...bySource.entries()]
      .map(([source, s]) => ({ source, collected: rupees(s.amount), students: s.students.size, share: pct(s.amount, collected) }))
      .sort((a, b) => b.collected - a.collected),
    quarterly: quarters,
    payment_status: Object.fromEntries(Object.entries(status).map(([k, v]) => [k, { count: v.count, amount: rupees(v.amount) }])),
  };
};

/* ------------------------------------------------------------------ */
/* Counselor performance                                               */
/* ------------------------------------------------------------------ */

const parseRange = ({ from, to } = {}) => {
  const end = to ? new Date(`${to}T23:59:59+05:30`) : new Date();
  const start = from ? new Date(`${from}T00:00:00+05:30`) : new Date(end.getTime() - 180 * DAY);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    throw new AppError("Invalid date range (use YYYY-MM-DD, from before to)", 400);
  }
  return { start, end };
};

export const getPerformanceReport = async (schoolId, query = {}) => {
  const sid = BigInt(schoolId);
  const { start, end } = parseRange(query);

  const [users, leads, activities, communications, tasks] = await Promise.all([
    prisma.user.findMany({
      where: { school_id: sid, status: "active", role: { in: ["counselor", "admin"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.lead.findMany({
      where: { school_id: sid, created_at: { gte: start, lte: end } },
      select: {
        id: true, assigned_to: true, follow_up_status: true, created_at: true,
        application: { select: { id: true, created_at: true } },
        admission: { select: { id: true, is_completed: true } },
      },
    }),
    prisma.activity.findMany({
      where: { lead: { school_id: sid }, created_at: { gte: start, lte: end } },
      select: { lead_id: true, activity_type: true, created_by: true, created_at: true },
    }),
    prisma.communication.findMany({
      where: { school_id: sid, created_at: { gte: start, lte: end } },
      select: { recipient_type: true, recipient_id: true, channel: true, status: true, created_by: true, created_at: true },
    }),
    prisma.task.findMany({
      where: { school_id: sid, due_date: { gte: start, lte: end } },
      select: { assigned_to: true, is_done: true, due_date: true },
    }),
  ]);

  const contacts = activities.filter((a) => !SYSTEM_ACTIVITY.has(a.activity_type));
  // First real contact per lead (an activity, or a message sent to the lead)
  const firstContact = new Map();
  const note = (leadId, at) => {
    const key = String(leadId);
    const t = new Date(at).getTime();
    if (!firstContact.has(key) || t < firstContact.get(key)) firstContact.set(key, t);
  };
  contacts.forEach((a) => note(a.lead_id, a.created_at));
  communications.filter((c) => c.recipient_type === "lead" && c.recipient_id).forEach((c) => note(c.recipient_id, c.created_at));

  const converted = (lead) => lead.application.length > 0 || lead.admission.length > 0;
  const admitted = (lead) => lead.admission.some((a) => a.is_completed);
  const responseHours = (lead) => {
    const first = firstContact.get(String(lead.id));
    return first === undefined ? null : Math.max(first - new Date(lead.created_at).getTime(), 0) / 3600000;
  };

  const staff = users.map((u) => {
    const uid = String(u.id);
    const mine = leads.filter((l) => String(l.assigned_to) === uid);
    const hours = mine.map(responseHours).filter((h) => h !== null);
    const myTasks = tasks.filter((t) => String(t.assigned_to) === uid);
    return {
      id: uid,
      name: u.name,
      role: u.role,
      leads: mine.length,
      contacted: mine.filter((l) => firstContact.has(String(l.id))).length,
      applications: mine.filter(converted).length,
      admissions: mine.filter(admitted).length,
      conversion_rate: pct(mine.filter(converted).length, mine.length),
      avg_response_hours: hours.length ? Math.round((hours.reduce((t, h) => t + h, 0) / hours.length) * 10) / 10 : null,
      activities: contacts.filter((a) => String(a.created_by) === uid).length + communications.filter((c) => String(c.created_by) === uid).length,
      tasks_done: myTasks.filter((t) => t.is_done).length,
      tasks_total: myTasks.length,
    };
  });

  const allHours = leads.map(responseHours).filter((h) => h !== null);
  const dueTasks = tasks.filter((t) => t.due_date && new Date(t.due_date) <= new Date());

  // Monthly: leads created and how many went on to an application
  const months = monthsBetween(start, end);
  const trend = months.map((k) => {
    const cohort = leads.filter((l) => monthKey(l.created_at) === k);
    return { month: monthLabel(k), leads: cohort.length, applications: cohort.filter(converted).length, conversion_rate: pct(cohort.filter(converted).length, cohort.length) };
  });

  // Contact volume by channel
  const volume = new Map();
  const add = (label) => volume.set(label, (volume.get(label) || 0) + 1);
  const label = (type) => {
    const t = String(type || "").toLowerCase();
    if (t.includes("call")) return "Calls";
    if (t.includes("email")) return "Emails";
    if (t.includes("whatsapp")) return "WhatsApp";
    if (t.includes("sms")) return "SMS";
    if (t.includes("meet") || t.includes("visit")) return "Meetings & visits";
    return "Other";
  };
  contacts.forEach((a) => add(label(a.activity_type)));
  communications.filter((c) => c.status !== "failed").forEach((c) => add(label(c.channel)));

  const buckets = [
    { label: "Within 1 hour", test: (h) => h <= 1 },
    { label: "1–4 hours", test: (h) => h > 1 && h <= 4 },
    { label: "4–24 hours", test: (h) => h > 4 && h <= 24 },
    { label: "Over 24 hours", test: (h) => h > 24 },
  ];

  return {
    range: { from: start.toISOString().slice(0, 10), to: end.toISOString().slice(0, 10) },
    kpis: {
      leads: leads.length,
      conversion_rate: pct(leads.filter(converted).length, leads.length),
      avg_response_hours: allHours.length ? Math.round((allHours.reduce((t, h) => t + h, 0) / allHours.length) * 10) / 10 : null,
      contacted_within_24h: pct(allHours.filter((h) => h <= 24).length, leads.length),
      follow_up_completion: pct(dueTasks.filter((t) => t.is_done).length, dueTasks.length),
    },
    staff,
    trend,
    activity: [...volume.entries()].map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    response_time: [
      ...buckets.map((b) => ({ label: b.label, count: allHours.filter(b.test).length })),
      { label: "Not contacted yet", count: leads.length - allHours.length },
    ],
  };
};

/* ------------------------------------------------------------------ */
/* Custom lead report                                                  */
/* ------------------------------------------------------------------ */

const MAX_ROWS = 5000;

export const getLeadReport = async (schoolId, query = {}) => {
  const sid = BigInt(schoolId);
  const { start, end } = parseRange({ from: query.from || "2000-01-01", to: query.to });
  const where = {
    school_id: sid,
    created_at: { gte: start, lte: end },
    ...(query.desired_class && { desired_class: String(query.desired_class) }),
    ...(query.source && { source: String(query.source) }),
    ...(query.status && { follow_up_status: String(query.status) }),
    ...(query.counselor && isId(query.counselor) && { assigned_to: String(query.counselor) }),
    ...(query.counselor === "unassigned" && { assigned_to: null }),
    ...(query.academic_year_id && isId(query.academic_year_id) && { academic_year_id: BigInt(query.academic_year_id) }),
  };

  const [rows, total, users] = await Promise.all([
    prisma.lead.findMany({
      where,
      select: {
        id: true, first_name: true, last_name: true, phone: true, email: true, desired_class: true,
        source: true, follow_up_status: true, assigned_to: true, created_at: true, last_contacted_at: true,
        application: { select: { status: true } },
      },
      orderBy: { created_at: "desc" },
      take: MAX_ROWS,
    }),
    prisma.lead.count({ where }),
    prisma.user.findMany({ where: { school_id: sid }, select: { id: true, name: true } }),
  ]);
  const names = new Map(users.map((u) => [String(u.id), u.name]));

  return {
    total,
    truncated: total > rows.length,
    rows: rows.map((l) => ({
      id: String(l.id),
      name: [l.first_name, l.last_name].filter(Boolean).join(" "),
      phone: l.phone,
      email: l.email,
      desired_class: l.desired_class,
      source: l.source,
      status: l.follow_up_status,
      counselor: l.assigned_to ? names.get(String(l.assigned_to)) || null : null,
      created_at: l.created_at,
      last_contacted_at: l.last_contacted_at,
      application_status: l.application[0]?.status || null,
    })),
  };
};

/* ------------------------------------------------------------------ */
/* Lookups for dropdowns                                               */
/* ------------------------------------------------------------------ */

// Common sources, merged with whatever the school's leads already use
export const DEFAULT_SOURCES = ["Website", "Walk-in", "Referral", "Phone Inquiry", "Social Media", "Ads", "Email Campaign"];

export const getLookups = async (schoolId) => {
  const sid = BigInt(schoolId);
  const [classes, years, sources, users] = await Promise.all([
    prisma.school_class.findMany({
      where: { school_id: sid },
      select: { class_name: true, class_numeric_value: true },
      orderBy: { class_numeric_value: "asc" },
    }),
    prisma.academic_year.findMany({
      where: { school_id: sid },
      select: { id: true, year_name: true, is_active: true, status: true },
      orderBy: { start_date: "desc" },
    }),
    prisma.lead.findMany({
      where: { school_id: sid, source: { not: null } },
      select: { source: true },
      distinct: ["source"],
    }),
    prisma.user.findMany({
      where: { school_id: sid, status: "active" },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const usedSources = sources.map((s) => s.source).filter(Boolean);
  return {
    classes: classes.map((c) => c.class_name),
    academic_years: yearList(years),
    sources: [...new Set([...DEFAULT_SOURCES, ...usedSources])],
    counselors: users.filter((u) => ["counselor", "admin"].includes(u.role)).map((u) => ({ id: String(u.id), name: u.name, role: u.role })),
  };
};
