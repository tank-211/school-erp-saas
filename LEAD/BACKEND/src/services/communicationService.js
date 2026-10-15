import { PrismaClient } from "@prisma/client";
import { sendSchoolEmail, sendSchoolSms, sendSchoolWhatsApp, schoolChannelStatus } from "../utils/schoolMessenger.js";

const prisma = new PrismaClient();

// communication_log columns: school_id, recipient_type, recipient_id, channel,
// subject, message, status, sent_at, created_by, created_at.
// SMS and WhatsApp are SENT through the school's own accounts (Super Admin →
// Schools → Communication) when the request asks to send ({ send: true });
// otherwise they are only recorded ("logged"), e.g. a message sent from a
// staff phone. Calls are always recorded.

const isId = (value) => /^\d+$/.test(String(value ?? ""));

const findSchoolLead = async (leadId, schoolId) => {
  if (!isId(leadId)) {
    const error = new Error("Valid leadId is required");
    error.statusCode = 400;
    throw error;
  }
  const lead = await prisma.lead.findFirst({
    where: { id: BigInt(leadId), school_id: BigInt(schoolId) },
    select: { id: true, email: true, phone: true, first_name: true, last_name: true },
  });
  if (!lead) {
    const error = new Error("Lead not found");
    error.statusCode = 404;
    throw error;
  }
  return lead;
};

// Adds the aliases the Communication page reads (type, content) to a log row.
const withAliases = (row) => ({
  ...row,
  type: row.channel ?? null,
  content: row.message ?? null,
});

export const sendEmailService = async (data, userId, schoolId) => {
  const lead = await findSchoolLead(data.leadId, schoolId);

  const recipientEmail = lead.email;
  if (!recipientEmail) {
    throw new Error("Lead has no email address");
  }

  // Sent from the school's own email account (Super Admin → Communication)
  await sendSchoolEmail(schoolId, {
    to: recipientEmail,
    subject: data.subject,
    text: data.content,
  });

  const communication = await prisma.communication.create({
    data: {
      school_id: BigInt(schoolId),
      recipient_type: "lead",
      recipient_id: lead.id,
      channel: "email",
      subject: data.subject,
      message: data.content,
      status: "sent",
      created_by: BigInt(userId),
    }
  });

  await prisma.activity.create({
    data: {
      activity_type: "email",
      notes: `Email sent to ${recipientEmail}: ${data.subject}`,
      lead_id: lead.id,
      created_by: BigInt(userId),
    },
  });

  return withAliases(communication);
};

// Shared by call, WhatsApp and SMS. status "sent" only when it was really sent.
const logInteraction = async ({ channel, leadId, message, activityNote, status = "logged", lead: knownLead }, userId, schoolId) => {
  const lead = knownLead || (await findSchoolLead(leadId, schoolId));

  const communication = await prisma.communication.create({
    data: {
      school_id: BigInt(schoolId),
      recipient_type: "lead",
      recipient_id: lead.id,
      channel,
      message: message || null,
      status,
      created_by: BigInt(userId),
    },
  });

  await prisma.activity.create({
    data: {
      activity_type: channel,
      notes: activityNote,
      lead_id: lead.id,
      created_by: BigInt(userId),
    },
  });

  // Logging a contact counts as contacting the lead
  await prisma.lead.update({
    where: { id: lead.id },
    data: { last_contacted_at: new Date() },
  });

  return withAliases(communication);
};

/** Which channels this school can send through (no secrets). */
export const channelStatusService = async (schoolId) => {
  const status = await schoolChannelStatus(schoolId);
  const one = (c) => ({ enabled: status[c].enabled, status: status[c].status });
  return { email: one("email"), sms: one("sms"), whatsapp: one("whatsapp") };
};

const LABEL = { sms: "SMS", whatsapp: "WhatsApp" };
const SENDERS = { sms: sendSchoolSms, whatsapp: sendSchoolWhatsApp };

// SMS / WhatsApp to a lead: sent through the school's account when data.send
// is true, otherwise only recorded.
const phoneMessage = async (channel, data, userId, schoolId) => {
  const message = String(data.message || "").trim();
  if (!message) {
    const error = new Error("Message is required");
    error.statusCode = 400;
    throw error;
  }
  const lead = await findSchoolLead(data.leadId, schoolId);

  if (data.send !== true && data.send !== "true") {
    const result = await logInteraction({
      channel,
      lead,
      message,
      activityNote: `${LABEL[channel]} (recorded): ${message}`,
    }, userId, schoolId);
    return { ...result, sent: false };
  }

  if (!lead.phone) {
    const error = new Error("This lead has no phone number on record.");
    error.statusCode = 400;
    throw error;
  }
  // Throws 409 "not set up" or the provider's reason; nothing is recorded then
  await SENDERS[channel](schoolId, { to: lead.phone, text: message });
  const result = await logInteraction({
    channel,
    lead,
    message,
    status: "sent",
    activityNote: `${LABEL[channel]} sent to ${lead.phone}: ${message}`,
  }, userId, schoolId);
  return { ...result, sent: true };
};

export const logCallService = (data, userId, schoolId) => {
  const duration = Number(data.duration) > 0 ? ` - ${Number(data.duration)}s` : "";
  return logInteraction({
    channel: "call",
    leadId: data.leadId,
    message: data.notes || "Call recorded",
    activityNote: `Call logged${duration}. ${data.notes || ""}`.trim(),
  }, userId, schoolId);
};

export const logWhatsAppService = (data, userId, schoolId) => phoneMessage("whatsapp", data, userId, schoolId);

export const logSMSService = (data, userId, schoolId) => phoneMessage("sms", data, userId, schoolId);

export const getCommunicationHistoryService = async (leadId, filters = {}) => {
  const page = Math.max(Number(filters.page) || 1, 1);
  const limit = Math.min(Math.max(Number(filters.limit) || 20, 1), 100);
  const where = {
    recipient_type: "lead",
    recipient_id: BigInt(leadId),
  };

  const [communications, total] = await Promise.all([
    prisma.communication.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.communication.count({ where }),
  ]);

  return {
    communications: communications.map(withAliases),
    pagination: { total, page, limit },
  };
};

// The route guard (requireOwnedCommunication) has already checked the school.
export const updateCommunicationService = async (id, data) => {
  const message = data.message ?? data.content;
  const communication = await prisma.communication.update({
    where: { id: BigInt(id) },
    data: {
      ...(message !== undefined && { message }),
      ...(data.subject !== undefined && { subject: data.subject }),
      ...(data.status && { status: data.status }),
    },
  });

  return withAliases(communication);
};

export const deleteCommunicationService = async (id) => {
  await prisma.communication.delete({
    where: { id: BigInt(id) },
  });

  return { message: "Communication record deleted successfully" };
};

// Every communication of the school, newest first, with lead and staff names.
const CHANNELS = ["email", "sms", "whatsapp", "call"];

export const listCommunicationsService = async (schoolId, query = {}) => {
  const sid = BigInt(schoolId);
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 50, 1), 200);
  const channel = CHANNELS.includes(String(query.channel || "").toLowerCase()) ? String(query.channel).toLowerCase() : null;
  const search = String(query.search || "").trim();

  const where = {
    school_id: sid,
    ...(channel && { channel }),
    ...(search && {
      OR: [
        { subject: { contains: search, mode: "insensitive" } },
        { message: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const [rows, total, byChannel] = await Promise.all([
    prisma.communication.findMany({ where, orderBy: { created_at: "desc" }, skip: (page - 1) * limit, take: limit }),
    prisma.communication.count({ where }),
    prisma.communication.groupBy({ by: ["channel"], where: { school_id: sid }, _count: { _all: true } }),
  ]);

  const leadIds = [...new Set(rows.filter((r) => r.recipient_type === "lead" && r.recipient_id).map((r) => String(r.recipient_id)))];
  const userIds = [...new Set(rows.filter((r) => r.created_by).map((r) => String(r.created_by)))];
  const [leads, users] = await Promise.all([
    leadIds.length
      ? prisma.lead.findMany({ where: { school_id: sid, id: { in: leadIds.map(BigInt) } }, select: { id: true, first_name: true, last_name: true, phone: true } })
      : [],
    userIds.length
      ? prisma.user.findMany({ where: { school_id: sid, id: { in: userIds.map(BigInt) } }, select: { id: true, name: true } })
      : [],
  ]);
  const leadById = new Map(leads.map((l) => [String(l.id), l]));
  const userName = new Map(users.map((u) => [String(u.id), u.name]));

  const counts = { all: 0, email: 0, sms: 0, whatsapp: 0, call: 0 };
  for (const g of byChannel) {
    const n = g._count?._all || 0;
    counts.all += n;
    if (g.channel in counts) counts[g.channel] += n;
  }

  return {
    items: rows.map((r) => {
      const lead = leadById.get(String(r.recipient_id));
      return {
        ...withAliases(r),
        lead_name: lead ? [lead.first_name, lead.last_name].filter(Boolean).join(" ") : null,
        lead_phone: lead?.phone || null,
        created_by_name: userName.get(String(r.created_by)) || null,
      };
    }),
    counts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};
