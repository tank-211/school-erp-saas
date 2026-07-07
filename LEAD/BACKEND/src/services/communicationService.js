import { PrismaClient } from "@prisma/client";
import { sendRealEmail } from "./emailService.js";

const prisma = new PrismaClient();



export const sendEmailService = async (data, userId) => {
  
  const lead = await prisma.lead.findUnique({
    where: {
      id: data.leadId,
    },
    select: {
      email: true,
      first_name: true,
      last_name: true,
    },
  });

  if (!lead) {
    throw new Error("Lead not found");
  }

  const recipientEmail = lead.email;
    console.log("RECIPIENT EMAIL:", recipientEmail);

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
        recipient_type: "lead",
        recipient_id: BigInt(data.leadId),
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
        lead_id: BigInt(data.leadId),
        created_by: BigInt(userId),
      },
    });

  return communication;
};

export const logCallService = async (data, userId) => {
  const communication = await prisma.communication.create({
    data: {
      activity_type: "call",
      content: data.notes || "Call recorded",
      lead_id: BigInt(data.leadId),
      created_by: BigInt(userId),
      status: "sent",
    },
    include: {
      lead: {
        select: { id: true, first_name: true, last_name: true },
      },
      User: {
        select: { id: true, name: true },
      },
    },
  });

  await prisma.activity.create({
    data: {
      activity_type: "call",
      notes: `Call logged${data.duration ? ` - ${data.duration}s` : ""}. ${data.notes || ""}`,
      lead_id: BigInt(data.leadId),
      created_by: BigInt(userId),
    },
  });

  return communication;
};

export const getCommunicationHistoryService = async (leadId, filters = {}) => {
  const communications = await prisma.communication.findMany({
    where: {
      recipient_type: "lead",
      recipient_id: BigInt(leadId),
    },
    orderBy: {
      created_at: "desc",
    },
    skip: (filters.page - 1) * filters.limit,
    take: filters.limit,
  });

  const total = await prisma.communication.count({
    where: {
      recipient_type: "lead",
      recipient_id: BigInt(leadId),
    },
  });

  return {
    communications,
    pagination: {
      total,
      page: filters.page,
      limit: filters.limit,
    },
  };
};

export const updateCommunicationService = async (id, data) => {
  const communication = await prisma.communication.update({
    where: { id },
    data: {
      ...(data.content && { content: data.content }),
      ...(data.status && { status: data.status }),
    },
    include: {
      User: {
        select: { id: true, name: true },
      },
    },
  });

  return communication;
};

export const deleteCommunicationService = async (id) => {
  await prisma.communication.delete({
    where: { id },
  });

  return { message: "Communication record deleted successfully" };
};
export const logWhatsAppService = async (data, userId) => {
    try {
    console.log("SERVICE DATA:", data);
    console.log("SERVICE USER:", userId);

  const communication = await prisma.communication.create({
    data: {
      activity_type: "whatsapp",
      content: data.message,
      lead_id: BigInt(data.leadId),
      created_by: BigInt(userId),
      status: "sent",
    },
  });

  console.log("COMMUNICATION CREATED");

  await prisma.activity.create({
    data: {
      activity_type: "whatsapp",
      notes: `WhatsApp: ${data.message}`,
      lead_id: BigInt(data.leadId),
      created_by: BigInt(userId),
    },
  });

  console.log("ACTIVITY CREATED");

  return communication;
  } catch (error) {
    console.error("WHATSAPP SERVICE ERROR:", error);
    throw error;
  }
};
export const logSMSService = async (data, userId) => {
  const communication = await prisma.communication.create({
    data: {
      activity_type: "sms",
      content: data.message,
      lead_id: BigInt(data.leadId),
      created_by: BigInt(userId),
      status: "sent",
    },
  });

  await prisma.activity.create({
    data: {
      activity_type: "sms",
      notes: `SMS: ${data.message}`,
      lead_id: BigInt(data.leadId),
      created_by: BigInt(userId),
    },
  });

  return communication;
};