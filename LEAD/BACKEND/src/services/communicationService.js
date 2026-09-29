import { PrismaClient } from "@prisma/client";
import { sendRealEmail } from "./emailService.js";

const prisma = new PrismaClient();

// communication_log columns: school_id, recipient_type, recipient_id, channel,
// subject, message, status, sent_at, created_by, created_at.
// Call / SMS / WhatsApp are LOGGED here, not sent: no SMS or WhatsApp provider
// is connected, so their status is "logged", never "sent".

const isId = (value) => /^\d+$/.test(String(value ?? ""));

const findSchoolLead = async (leadId, schoolId) => {
  if (!isId(leadId)) {
    const error = new Error("Valid leadId is required");
    error.statusCode = 400;
    throw error;
  }
  const lead = await prisma.lead.findFirst({
    where: { id: BigInt(leadId), school_id: BigInt(schoolId) },
    select: { id: true, email: true, first_name: true, last_name: true },
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

  await sendRealEmail({
    to: recipientEmail,
    subject: data.subject,
    content: data.content,
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

// Shared by call, WhatsApp and SMS logging.
const logInteraction = async ({ channel, leadId, message, activityNote }, userId, schoolId) => {
  const lead = await findSchoolLead(leadId, schoolId);

  const communication = await prisma.communication.create({
    data: {
      school_id: BigInt(schoolId),
      recipient_type: "lead",
      recipient_id: lead.id,
      channel,
      message: message || null,
      status: "logged",
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

export const logCallService = (data, userId, schoolId) => {
  const duration = Number(data.duration) > 0 ? ` - ${Number(data.duration)}s` : "";
  return logInteraction({
    channel: "call",
    leadId: data.leadId,
    message: data.notes || "Call recorded",
    activityNote: `Call logged${duration}. ${data.notes || ""}`.trim(),
  }, userId, schoolId);
};

export const logWhatsAppService = (data, userId, schoolId) => {
  if (!data.message) {
    const error = new Error("Message is required");
    error.statusCode = 400;
    throw error;
  }
  return logInteraction({
    channel: "whatsapp",
    leadId: data.leadId,
    message: data.message,
    activityNote: `WhatsApp: ${data.message}`,
  }, userId, schoolId);
};

export const logSMSService = (data, userId, schoolId) => {
  if (!data.message) {
    const error = new Error("Message is required");
    error.statusCode = 400;
    throw error;
  }
  return logInteraction({
    channel: "sms",
    leadId: data.leadId,
    message: data.message,
    activityNote: `SMS: ${data.message}`,
  }, userId, schoolId);
};

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
