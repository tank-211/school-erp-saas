import prisma from '../src/lib/prisma.js';
import AppError from '../utils/appError.js';
import { sendSMS } from '../utils/smsSender.js';

const VALID_RECIPIENT_TYPES = new Set(['lead', 'student', 'parent']);


const assertRecipientType = (recipientType) => {
  if (!VALID_RECIPIENT_TYPES.has(recipientType)) {
    throw new AppError('recipient_type must be one of: lead, student, parent', 400);
  }
};

const parsePagination = (query) => {
  const limit = Math.min(100, Math.max(1, Number.parseInt(query.limit, 10) || 20));
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  return {
    limit,
    page,
    offset: (page - 1) * limit,
  };
};

const getRecipientByType = async (schoolId, recipientType, recipientId) => {
  const where = {
    id: BigInt(recipientId),
    school_id: BigInt(schoolId),
  };

  if (recipientType === 'lead') {
    return prisma.lead.findFirst({
      where,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone: true,
      },
    });
  }

  if (recipientType === 'student') {
    return prisma.student.findFirst({
      where,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone: true,
      },
    });
  }

  return prisma.parent_detail.findFirst({
    where,
    select: {
      id: true,
      first_name: true,
      last_name: true,
      phone: true,
    },
  });
};

export const sendSms = async (schoolId, userId, payload) => {
  assertRecipientType(payload.recipient_type);

  const recipientId = Number.parseInt(payload.recipient_id, 10);

  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    throw new AppError(
      'recipient_id must be a positive integer',
      400
    );
  }

  const message =
    typeof payload.message === 'string'
      ? payload.message.trim()
      : '';

  if (!message) {
    throw new AppError('message is required', 400);
  }

  const recipient = await getRecipientByType(
    schoolId,
    payload.recipient_type,
    recipientId
  );

  if (!recipient) {
    throw new AppError(
      'Recipient not found for this school',
      404
    );
  }

  if (!recipient.phone) {
    throw new AppError(
      'Recipient phone is missing',
      400
    );
  }

  const dispatchResult = await sendSMS(
    recipient.phone,
    message
  );

  const communicationLog =
    await prisma.communication_log.create({
      data: {
        school_id: BigInt(schoolId),
        recipient_type: payload.recipient_type,
        recipient_id: BigInt(recipientId),
        channel: 'sms',
        subject: null,
        message,
        status: dispatchResult.status || 'sent',
        sent_at: dispatchResult.sent_at || new Date(),
        created_by: String(userId),
      },

      select: {
        id: true,
        school_id: true,
        recipient_type: true,
        recipient_id: true,
        channel: true,
        subject: true,
        message: true,
        status: true,
        sent_at: true,
        created_by: true,
      },
    });

  return {
    ...communicationLog,
    provider_message_id:
      dispatchResult.provider_message_id || null,
  };
};

export const getSmsLogs = async (schoolId, query) => {
  try {
    const logs = await prisma.communication_log.findMany({
      where: {
        school_id: BigInt(schoolId),
        channel: 'sms',
      },
      orderBy: {
        sent_at: 'desc',
      },
      select: {
        id: true,
        message: true,
        status: true,
        sent_at: true,
        recipient_type: true,
        recipient_id: true,
      },
    });

    const result = await Promise.all(
      logs.map(async (log) => {
        let recipient = null;

        if (log.recipient_type === 'lead') {
          recipient = await prisma.lead.findFirst({
            where: {
              id: log.recipient_id,
              school_id: BigInt(schoolId),
            },
            select: {
              first_name: true,
              last_name: true,
            },
          });
        } else if (log.recipient_type === 'student') {
          recipient = await prisma.student.findFirst({
            where: {
              id: log.recipient_id,
              school_id: BigInt(schoolId),
            },
            select: {
              first_name: true,
              last_name: true,
            },
          });
        } else if (log.recipient_type === 'parent') {
          recipient = await prisma.parent_detail.findFirst({
            where: {
              id: log.recipient_id,
              school_id: BigInt(schoolId),
            },
            select: {
              first_name: true,
              last_name: true,
            },
          });
        }

        return {
          id: log.id,
          message: log.message,
          status: log.status,
          sent_at: log.sent_at,
          recipient_name: recipient
            ? [recipient.first_name, recipient.last_name]
                .filter(Boolean)
                .join(' ')
            : null,
          recipient_type: log.recipient_type,
          recipient_id: log.recipient_id,
        };
      })
    );

    return result;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
