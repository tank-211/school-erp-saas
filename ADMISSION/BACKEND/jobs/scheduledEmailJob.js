import cron from 'node-cron';
import * as communicationQueries from '../db/queries/communicationQueries.js';
import { sendMailWithGmail } from '../config/mailer.js';

let schedulerTask = null;
let isRunning = false;

const parseRecipients = (recipients) =>
  String(recipients || '')
    .split(',')
    .map((email) => email.trim())
    .filter(Boolean);

const toNodemailerAttachments = (attachments) =>
  Array.isArray(attachments)
    ? attachments.map((attachment) => ({
        filename: attachment.original_name || attachment.file_name,
        path: attachment.file_path,
        contentType: attachment.mime_type,
      }))
    : [];

const processPendingScheduledEmails = async () => {
  if (isRunning) {
    return;
  }

  isRunning = true;

  try {
    const dueEmails = await communicationQueries.getPendingScheduledEmails(100);

    for (const scheduledEmail of dueEmails) {
      const recipientList = parseRecipients(scheduledEmail.recipients);

      try {
        if (!scheduledEmail.recipient_id || !scheduledEmail.recipient_type) {
          throw new Error('Scheduled email is missing recipient_id or recipient_type.');
        }

        await sendMailWithGmail({
          to: recipientList.join(','),
          subject: scheduledEmail.subject,
          text: scheduledEmail.message,
          attachments: toNodemailerAttachments(scheduledEmail.attachments),
        });

        await communicationQueries.createSimpleCommunicationLog({
          school_id: scheduledEmail.school_id,
          sender_id: scheduledEmail.sender_id,
          recipient_type: scheduledEmail.recipient_type,
          recipient_id: scheduledEmail.recipient_id,
          recipient_email: scheduledEmail.recipients,
          subject: scheduledEmail.subject,
          message: scheduledEmail.message,
        });

        await communicationQueries.updateScheduledEmailStatus(scheduledEmail.id, 'sent');
      } catch (error) {
        console.error('Failed to send scheduled email', {
          id: scheduledEmail.id,
          error: error.message,
        });

        await communicationQueries.updateScheduledEmailStatus(scheduledEmail.id, 'failed');
      }
    }
  } catch (error) {
    console.error('Scheduled email processor failed:', error.message);
  } finally {
    isRunning = false;
  }
};

export const startScheduledEmailJob = () => {
  if (schedulerTask) {
    return schedulerTask;
  }

  schedulerTask = cron.schedule('* * * * *', processPendingScheduledEmails, {
    timezone: process.env.CRON_TIMEZONE || 'UTC',
  });

  return schedulerTask;
};
