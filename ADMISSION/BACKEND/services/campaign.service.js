import prisma from '../src/lib/prisma.js';
import AppError from '../utils/appError.js';
import { sendSMS } from '../utils/smsSender.js';
import { sendWhatsApp } from '../utils/whatsappSender.js';

const VALID_CHANNELS = new Set(['email', 'sms', 'whatsapp']);
const VALID_AUDIENCE_TYPES = new Set(['lead', 'student', 'parent']);


const assertChannel = (channel) => {
  if (!VALID_CHANNELS.has(channel)) {
    throw new AppError('channel must be one of: email, sms, whatsapp', 400);
  }
};

const assertAudienceType = (audienceType) => {
  if (!VALID_AUDIENCE_TYPES.has(audienceType)) {
    throw new AppError('audience_type must be one of: lead, student, parent', 400);
  }
};

const ensureMessageForChannel = (channel, payload) => {
  if (channel === 'email') {
    const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
    const message = typeof payload.message === 'string' ? payload.message.trim() : '';

    if (!subject || !message) {
      throw new AppError('subject and message are required for email campaigns', 400);
    }

    return { subject, message };
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (!message) {
    throw new AppError('message is required for sms/whatsapp campaigns', 400);
  }

  return {
    subject: null,
    message,
  };
};

const dispatchCampaignMessage = async (channel, recipient, normalizedPayload) => {
  if (channel === 'sms') {
    if (!recipient.phone) {
      return { status: 'failed', provider_message_id: null, sent_at: null, error: 'Recipient phone is missing' };
    }

    const result = await sendSMS(recipient.phone, normalizedPayload.message);
    return {
      status: result.status || 'sent',
      provider_message_id: result.provider_message_id || null,
      sent_at: result.sent_at || new Date(),
    };
  }

  if (channel === 'whatsapp') {
    if (!recipient.phone) {
      return { status: 'failed', provider_message_id: null, sent_at: null, error: 'Recipient phone is missing' };
    }

    const result = await sendWhatsApp(recipient.phone, normalizedPayload.message);
    return {
      status: result.status || 'sent',
      provider_message_id: result.provider_message_id || null,
      sent_at: result.sent_at || new Date(),
    };
  }

  if (!recipient.email) {
    return { status: 'failed', provider_message_id: null, sent_at: null, error: 'Recipient email is missing' };
  }

  console.log('Email sent:', {
    to: recipient.email,
    subject: normalizedPayload.subject,
    message: normalizedPayload.message,
  });

  return {
    status: 'sent',
    provider_message_id: `email-${Date.now()}`,
    sent_at: new Date(),
  };
};

export const createCampaign = async (schoolId, payload) => {
  const name =
    typeof payload.name === 'string'
      ? payload.name.trim()
      : '';

  if (!name) {
    throw new AppError('name is required', 400);
  }

  assertChannel(payload.channel);
  assertAudienceType(payload.audience_type);

  try {
    const campaign = await prisma.campaign.create({
      data: {
        school_id: BigInt(schoolId),
        name,
        channel: payload.channel,
        audience_type: payload.audience_type,
        status: 'draft',

        start_date: payload.start_date
          ? new Date(payload.start_date)
          : null,

        end_date: payload.end_date
          ? new Date(payload.end_date)
          : null,
      },
    });

    return campaign;
  } catch (error) {
    throw new AppError(
      `Failed to create campaign: ${error.message}`,
      500
    );
  }
};

export const getCampaigns = async (schoolId) => {
  try {
    return await prisma.campaign.findMany({
      where: {
        school_id: BigInt(schoolId),
      },
      orderBy: {
        created_at: 'desc',
      },
    });
  } catch (error) {
    console.error(error);
    throw error;
  }
};

export const sendCampaign = async (schoolId, userId, campaignId, payload) => {
  const parsedCampaignId = BigInt(campaignId);
  const schoolIdBigInt = BigInt(schoolId);

  if (parsedCampaignId <= 0n) {
    throw new AppError('campaign id must be a positive integer', 400);
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parsedCampaignId,
      school_id: schoolIdBigInt,
    },
  });

  if (!campaign) {
    throw new AppError('Campaign not found', 404);
  }

  const audienceType =
    campaign.audience_type || payload.audience_type;

  assertAudienceType(audienceType);
  assertChannel(campaign.channel);

  const normalizedPayload = ensureMessageForChannel(
    campaign.channel,
    payload
  );

  // Fetch recipients using Prisma
  let recipients = [];

  if (audienceType === 'lead') {
    recipients = await prisma.lead.findMany({
      where: {
        school_id: schoolIdBigInt,
      },
      orderBy: {
        id: 'desc',
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone: true,
        email: true,
      },
    });
  }

  if (audienceType === 'student') {
    recipients = await prisma.student.findMany({
      where: {
        school_id: schoolIdBigInt,
      },
      orderBy: {
        id: 'desc',
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone: true,
        email: true,
      },
    });
  }

  if (audienceType === 'parent') {
    recipients = await prisma.parent_detail.findMany({
      where: {
        school_id: schoolIdBigInt,
      },
      orderBy: {
        id: 'desc',
      },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone: true,
        email: true,
      },
    });
  }

  if (!recipients.length) {
    throw new AppError(
      'No recipients found for this campaign audience',
      404
    );
  }

  // Mark campaign as running
  await prisma.campaign.update({
    where: {
      id: parsedCampaignId,
    },
    data: {
      status: 'running',
    },
  });

  const sendResults = await Promise.all(
    recipients.map(async (recipient) => {
      const recipientName = [
        recipient.first_name,
        recipient.last_name,
      ]
        .filter(Boolean)
        .join(' ');

      const dispatch = await dispatchCampaignMessage(
        campaign.channel,
        {
          ...recipient,
          name: recipientName,
        },
        normalizedPayload
      );

      const communication = await prisma.communication_log.create({
        data: {
          school_id: schoolIdBigInt,
          campaign_id: parsedCampaignId,

          recipient_type: audienceType,
          recipient_id: recipient.id,

          channel: campaign.channel,

          subject: normalizedPayload.subject,
          message: normalizedPayload.message,

          status: dispatch.status,

          sent_at: dispatch.sent_at || new Date(),

          created_by: userId
            ? BigInt(userId)
            : null,
        },

        select: {
          id: true,
          recipient_id: true,
          recipient_type: true,
          channel: true,
          status: true,
          sent_at: true,
        },
      });

      return {
        communication_id: communication.id,
        recipient_id: recipient.id,
        recipient_name: recipientName,
        status: dispatch.status,
        provider_message_id:
          dispatch.provider_message_id || null,
        error: dispatch.error || null,
      };
    })
  );

  const sentCount = sendResults.filter(
    (item) => item.status === 'sent'
  ).length;

  const failedCount =
    sendResults.length - sentCount;

  await prisma.campaign.update({
    where: {
      id: parsedCampaignId,
    },
    data: {
      status:
        sentCount > 0
          ? 'completed'
          : 'failed',
    },
  });

  return {
    campaign_id: parsedCampaignId,
    campaign_name: campaign.name,
    channel: campaign.channel,
    audience_type: audienceType,
    total_recipients: recipients.length,
    sent_count: sentCount,
    failed_count: failedCount,
    results: sendResults,
  };
};
