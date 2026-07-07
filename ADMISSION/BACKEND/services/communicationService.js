import pool from '../db/pool.js';
import * as communicationQueries from '../db/queries/communicationQueries.js';
import { dispatchCommunication } from '../utils/communicationProviders.js';
import { sendMailWithGmail } from '../config/mailer.js';
import AppError from '../utils/appError.js';
import {
  assertPositiveInteger,
  assertValidChannel,
  assertValidCommunicationStatus,
  assertValidRecipientType,
  normalizeDateRangeFilters,
  parsePagination,
} from '../utils/communicationValidation.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseRecipients = (rawRecipients) => {
  const recipients = String(rawRecipients || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

  const uniqueRecipients = [...new Set(recipients)];

  if (!uniqueRecipients.length) {
    throw new AppError('recipients is required and must contain at least one email.', 400);
  }

  const invalidRecipients = uniqueRecipients.filter((email) => !EMAIL_REGEX.test(email));
  if (invalidRecipients.length) {
    throw new AppError(`Invalid recipient email(s): ${invalidRecipients.join(', ')}`, 400);
  }

  return uniqueRecipients;
};

const mapAttachmentMetadata = (files = []) =>
  files.map((file) => ({
    original_name: file.originalname,
    file_name: file.filename,
    file_path: file.path,
    mime_type: file.mimetype,
    size: file.size,
  }));

const mapNodemailerAttachments = (attachments = []) =>
  attachments.map((attachment) => ({
    filename: attachment.original_name || attachment.file_name,
    path: attachment.file_path,
    contentType: attachment.mime_type,
  }));

const buildTemplateVariables = (recipient) => ({
  recipient_name: recipient.name || '',
  first_name: recipient.first_name || '',
  last_name: recipient.last_name || '',
  email: recipient.email || '',
  phone: recipient.phone || '',
  context_label: recipient.context_label || '',
});

const applyTemplateVariables = (input = '', variables = {}) =>
  Object.entries(variables).reduce((content, [key, value]) => {
    const token = new RegExp(`{{\\s*${key}\\s*}}`, 'gi');
    return content.replace(token, value ?? '');
  }, input);

const resolvePayloadFromTemplate = (template, payload, recipient) => {
  const variables = buildTemplateVariables(recipient);
  const subject = applyTemplateVariables(payload.subject || template?.subject || '', variables).trim();
  const message = applyTemplateVariables(payload.message || template?.content || '', variables).trim();

  return {
    subject,
    message,
  };
};

const resolveRecipient = async (schoolId, recipientType, recipientId) => {
  const recipient = await communicationQueries.getRecipientByTypeAndId(recipientType, recipientId, schoolId);

  if (!recipient) {
    throw new AppError('Recipient not found for this school.', 404);
  }

  return recipient;
};

const normalizeScheduleType = (value) => String(value || '').trim().toLowerCase();

const buildComposeLogPayload = ({ schoolId, userId, recipientType, recipientId, subject, message, channel = 'email' }) => ({
  school_id: schoolId,
  created_by: userId,
  recipient_type: recipientType,
  recipient_id: recipientId,
  channel,
  subject,
  message,
  status: 'sent',
});

const resolveComposeRecipient = (payload) => {
  if (!payload?.recipient_type) {
    throw new AppError('recipient_type is required for compose email.', 400);
  }

  assertValidRecipientType(payload.recipient_type);

  if (!payload?.recipient_id) {
    throw new AppError('recipient_id is required for compose email.', 400);
  }

  const recipientId = assertPositiveInteger(payload.recipient_id, 'recipient_id');
  return {
    recipient_type: payload.recipient_type,
    recipient_id: recipientId,
  };
};

const sendCommunicationLegacy = async (schoolId, userId, payload) => {
  assertValidRecipientType(payload.recipient_type);
  assertValidChannel(payload.channel);
  const recipientId = assertPositiveInteger(payload.recipient_id, 'recipient_id');

  const recipient = await resolveRecipient(schoolId, payload.recipient_type, recipientId);
  const template = payload.template_id
    ? await communicationQueries.getTemplateById(assertPositiveInteger(payload.template_id, 'template_id'), schoolId)
    : null;

  if (payload.template_id && !template) {
    throw new AppError('Template not found for this school.', 404);
  }

  const resolvedPayload = resolvePayloadFromTemplate(template, payload, recipient);

  if (!resolvedPayload.message) {
    throw new AppError('message is required when template content is not available.', 400);
  }

  if (payload.channel === 'email' && !resolvedPayload.subject) {
    throw new AppError('subject is required for email communication.', 400);
  }

  const providerResult = await dispatchCommunication(payload.channel, recipient, resolvedPayload);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const communicationLog = await communicationQueries.createCommunicationLog(client, {
      school_id: schoolId,
      recipient_type: payload.recipient_type,
      recipient_id: recipientId,
      channel: payload.channel,
      subject: resolvedPayload.subject || null,
      message: resolvedPayload.message,
      status: providerResult.status || 'sent',
      sent_at: providerResult.sentAt || new Date(),
      created_by: String(userId),
    });

    if (template) {
      await communicationQueries.touchTemplateLastUsedWithClient(client, template.id, schoolId);
    }

    await client.query('COMMIT');

    return {
      ...communicationLog,
      recipient,
      provider_message_id: providerResult.providerMessageId,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

export const sendCommunication = async (schoolId, userId, payload = {}, files = []) => {
  if (!schoolId) {
    throw new AppError('school_id is required to send communication.', 400);
  }

  if (!userId) {
    throw new AppError('sender_id is required to send communication.', 400);
  }

  const composeEmailRequest =
    typeof payload.recipients === 'string' ||
    typeof payload.scheduleType === 'string' ||
    typeof payload.scheduledDate === 'string';

  if (!composeEmailRequest) {
    return sendCommunicationLegacy(schoolId, userId, payload);
  }

  const recipients = parseRecipients(payload.recipients);
  const subject = String(payload.subject || '').trim();
  const message = String(payload.message || '').trim();
  const attachmentMetadata = mapAttachmentMetadata(files);
  const scheduleType = normalizeScheduleType(payload.scheduleType);
  const composeRecipient = resolveComposeRecipient(payload);
  const channel = payload.channel || 'email';
  assertValidChannel(channel);

  if (!subject) {
    throw new AppError('subject is required.', 400);
  }

  if (!message) {
    throw new AppError('message is required.', 400);
  }

  const scheduledDate = payload.scheduledDate ? new Date(payload.scheduledDate) : null;
  if (payload.scheduledDate && Number.isNaN(scheduledDate?.getTime())) {
    throw new AppError('scheduledDate must be a valid date-time value.', 400);
  }

  const scheduleLater =
    scheduleType === 'schedule for later' ||
    scheduleType === 'later' ||
    scheduleType === 'scheduled';

  if (scheduleLater) {
    if (!scheduledDate) {
      throw new AppError('scheduledDate is required when scheduling an email.', 400);
    }

    const scheduledEmail = await communicationQueries.createScheduledEmail({
      school_id: schoolId,
      sender_id: userId,
      recipient_type: composeRecipient.recipient_type,
      recipient_id: composeRecipient.recipient_id,
      recipients: recipients.join(','),
      subject,
      message,
      attachments: attachmentMetadata,
      scheduled_at: scheduledDate,
      status: 'pending',
    });

    return {
      scheduled: true,
      id: scheduledEmail.id,
      recipients: recipients.join(','),
      subject,
      scheduled_at: scheduledEmail.scheduled_at,
    };
  }

  const transporterResponse = await sendMailWithGmail({
    to: recipients.join(','),
    subject,
    text: message,
    attachments: mapNodemailerAttachments(attachmentMetadata),
  });

  const emailLog = await communicationQueries.createSimpleCommunicationLog(
    {
      ...buildComposeLogPayload({
        schoolId,
        userId,
        recipientType: composeRecipient.recipient_type,
        recipientId: composeRecipient.recipient_id,
        subject,
        message,
        channel,
      }),
    },
  );

  return {
    scheduled: false,
    id: emailLog.id,
    recipients: emailLog.recipient_email || emailLog.recipients,
    subject: emailLog.subject,
    sent_at: emailLog.sent_at,
    provider_message_id: transporterResponse?.messageId || null,
  };
};

export const getCommunicationLogs = async (schoolId, query) => {
  const pagination = parsePagination(query);
  const filters = {
    ...normalizeDateRangeFilters(query),
    recipient_type: query.recipient_type || undefined,
    channel: query.channel || undefined,
    status: query.status || undefined,
  };

  if (filters.recipient_type) {
    assertValidRecipientType(filters.recipient_type);
  }

  if (filters.channel) {
    assertValidChannel(filters.channel);
  }

  if (filters.status) {
    assertValidCommunicationStatus(filters.status);
  }

  const result = await communicationQueries.getCommunicationLogs(schoolId, filters, pagination);

  return {
    logs: result.rows,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: result.total,
      total_pages: Math.max(1, Math.ceil(result.total / pagination.limit)),
    },
  };
};

export const updateCommunicationStatus = async (schoolId, communicationId, payload) => {
  const id = assertPositiveInteger(communicationId, 'communication id');
  assertValidCommunicationStatus(payload.status);

  const existingLog = await communicationQueries.getCommunicationLogById(id, schoolId);
  if (!existingLog) {
    throw new AppError('Communication log not found.', 404);
  }

  const timestamps = {};
  const now = new Date();

  if (payload.status === 'delivered') {
    timestamps.delivered_at = payload.delivered_at || now;
  }

  if (payload.status === 'opened') {
    timestamps.delivered_at = existingLog.delivered_at || now;
    timestamps.opened_at = payload.opened_at || now;
  }

  if (payload.status === 'clicked') {
    timestamps.delivered_at = existingLog.delivered_at || now;
    timestamps.opened_at = existingLog.opened_at || now;
    timestamps.clicked_at = payload.clicked_at || now;
  }

  const updatedLog = await communicationQueries.updateCommunicationStatus(id, schoolId, {
    status: payload.status,
    ...timestamps,
  });

  return updatedLog;
};

export const getRecipients = async (schoolId, recipientType, search) => {
  assertValidRecipientType(recipientType);
  return communicationQueries.getRecipientsByType(recipientType, schoolId, search?.trim());
};

export const sendEmailCommunication = async (schoolId, userId, payload = {}, files = []) =>
  sendCommunication(schoolId, userId, payload, files);
