import pool from '../db/db.js';
import AppError from '../utils/appError.js';
import { sendWhatsApp } from '../utils/whatsappSender.js';

const VALID_RECIPIENT_TYPES = new Set(['lead', 'student', 'parent']);

const recipientQueries = {
  lead: 'SELECT id, first_name, last_name, phone FROM lead WHERE id = $1 AND school_id = $2',
  student: 'SELECT id, first_name, last_name, phone FROM student WHERE id = $1 AND school_id = $2',
  parent: 'SELECT id, first_name, last_name, phone FROM parent_detail WHERE id = $1 AND school_id = $2',
};

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
  const result = await pool.query(recipientQueries[recipientType], [recipientId, schoolId]);
  return result.rows[0] || null;
};

export const sendWhatsapp = async (schoolId, userId, payload) => {
  assertRecipientType(payload.recipient_type);

  const recipientId = Number.parseInt(payload.recipient_id, 10);
  if (!Number.isInteger(recipientId) || recipientId <= 0) {
    throw new AppError('recipient_id must be a positive integer', 400);
  }

  const message = typeof payload.message === 'string' ? payload.message.trim() : '';
  if (!message) {
    throw new AppError('message is required', 400);
  }

  const recipient = await getRecipientByType(schoolId, payload.recipient_type, recipientId);
  if (!recipient) {
    throw new AppError('Recipient not found for this school', 404);
  }

  if (!recipient.phone) {
    throw new AppError('Recipient phone is missing', 400);
  }

  const dispatchResult = await sendWhatsApp(recipient.phone, message);

  const insertResult = await pool.query(
    `INSERT INTO communication_log (
      school_id,
      recipient_type,
      recipient_id,
      channel,
      subject,
      message,
      status,
      sent_at,
      created_by
    ) VALUES ($1,$2,$3,'whatsapp',NULL,$4,$5,COALESCE($6, NOW()),$7)
    RETURNING id, school_id, recipient_type, recipient_id, channel, subject, message, status, sent_at, created_by`,
    [
      schoolId,
      payload.recipient_type,
      recipientId,
      message,
      dispatchResult.status || 'sent',
      dispatchResult.sent_at || null,
      String(userId),
    ]
  );

  return {
    ...insertResult.rows[0],
    provider_message_id: dispatchResult.provider_message_id,
  };
};

export const getWhatsappLogs = async (schoolId, query) => {
  try {
    const result = await pool.query(
      `SELECT
        cl.id,
        cl.message,
        cl.status,
        cl.sent_at,
        CASE
          WHEN cl.recipient_type = 'lead' THEN TRIM(CONCAT(COALESCE(l.first_name, ''), ' ', COALESCE(l.last_name, '')))
          WHEN cl.recipient_type = 'student' THEN TRIM(CONCAT(COALESCE(s.first_name, ''), ' ', COALESCE(s.last_name, '')))
          WHEN cl.recipient_type = 'parent' THEN TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, '')))
          ELSE NULL
        END AS recipient_name,
        cl.recipient_type,
        cl.recipient_id
      FROM communication_log cl
      LEFT JOIN lead l ON cl.recipient_id = l.id AND cl.recipient_type = 'lead' AND l.school_id = cl.school_id
      LEFT JOIN student s ON cl.recipient_id = s.id AND cl.recipient_type = 'student' AND s.school_id = cl.school_id
      LEFT JOIN parent_detail p ON cl.recipient_id = p.id AND cl.recipient_type = 'parent' AND p.school_id = cl.school_id
      WHERE cl.school_id = $1 AND cl.channel = 'whatsapp'
      ORDER BY cl.sent_at DESC`,
      [schoolId]
    );

    return result.rows;
  } catch (err) {
    console.error(err);
    throw err;
  }
};
