import pool from '../db/db.js';
import AppError from '../utils/appError.js';
import { sendSMS } from '../utils/smsSender.js';
import { sendWhatsApp } from '../utils/whatsappSender.js';

const VALID_CHANNELS = new Set(['email', 'sms', 'whatsapp']);
const VALID_AUDIENCE_TYPES = new Set(['lead', 'student', 'parent']);

const recipientAudienceQueries = {
  lead: `
    SELECT id, TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS name, phone, email
    FROM lead
    WHERE school_id = $1
    ORDER BY id DESC
  `,
  student: `
    SELECT id, TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS name, phone, email
    FROM student
    WHERE school_id = $1
    ORDER BY id DESC
  `,
  parent: `
    SELECT id, TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS name, phone, email
    FROM parent_detail
    WHERE school_id = $1
    ORDER BY id DESC
  `,
};

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
  const name = typeof payload.name === 'string' ? payload.name.trim() : '';
  if (!name) {
    throw new AppError('name is required', 400);
  }

  assertChannel(payload.channel);
  assertAudienceType(payload.audience_type);

  const insertResult = await pool.query(
    `INSERT INTO campaign (school_id, name, channel, audience_type, status, start_date, end_date)
     VALUES ($1,$2,$3,$4,'draft',$5,$6)
     RETURNING *`,
    [
      schoolId,
      name,
      payload.channel,
      payload.audience_type,
      payload.start_date || null,
      payload.end_date || null,
    ]
  );

  return insertResult.rows[0];
};

export const getCampaigns = async (schoolId) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM campaign
       WHERE school_id = $1
       ORDER BY created_at DESC`,
      [schoolId]
    );

    return result.rows;
  } catch (err) {
    console.error(err);
    throw err;
  }
};

export const sendCampaign = async (schoolId, userId, campaignId, payload) => {
  const parsedCampaignId = Number.parseInt(campaignId, 10);
  if (!Number.isInteger(parsedCampaignId) || parsedCampaignId <= 0) {
    throw new AppError('campaign id must be a positive integer', 400);
  }

  const campaignResult = await pool.query(
    `SELECT * FROM campaign WHERE id = $1 AND school_id = $2`,
    [parsedCampaignId, schoolId]
  );
  const campaign = campaignResult.rows[0];

  if (!campaign) {
    throw new AppError('Campaign not found', 404);
  }

  const audienceType = campaign.audience_type || payload.audience_type;
  assertAudienceType(audienceType);
  assertChannel(campaign.channel);

  const normalizedPayload = ensureMessageForChannel(campaign.channel, payload);

  const recipientsResult = await pool.query(recipientAudienceQueries[audienceType], [schoolId]);
  const recipients = recipientsResult.rows;

  if (!recipients.length) {
    throw new AppError('No recipients found for this campaign audience', 404);
  }

  await pool.query(
    `UPDATE campaign SET status = 'running' WHERE id = $1 AND school_id = $2`,
    [parsedCampaignId, schoolId]
  );

  const sendResults = await Promise.all(
    recipients.map(async (recipient) => {
      const dispatch = await dispatchCampaignMessage(campaign.channel, recipient, normalizedPayload);

      const logResult = await pool.query(
        `INSERT INTO communication_log (
          school_id,
          campaign_id,
          recipient_type,
          recipient_id,
          channel,
          subject,
          message,
          status,
          sent_at,
          created_by
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9, NOW()),$10)
        RETURNING id, recipient_id, recipient_type, channel, status, sent_at`,
        [
          schoolId,
          parsedCampaignId,
          audienceType,
          recipient.id,
          campaign.channel,
          normalizedPayload.subject,
          normalizedPayload.message,
          dispatch.status,
          dispatch.sent_at,
          String(userId),
        ]
      );

      return {
        communication_id: logResult.rows[0].id,
        recipient_id: recipient.id,
        recipient_name: recipient.name,
        status: dispatch.status,
        provider_message_id: dispatch.provider_message_id,
        error: dispatch.error || null,
      };
    })
  );

  const sentCount = sendResults.filter((item) => item.status === 'sent').length;
  const failedCount = sendResults.length - sentCount;

  await pool.query(
    `UPDATE campaign
     SET status = CASE WHEN $3::int > 0 THEN 'completed' ELSE 'failed' END
     WHERE id = $1 AND school_id = $2`,
    [parsedCampaignId, schoolId, sentCount]
  );

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
