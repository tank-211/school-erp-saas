/**
 * Sends one SMS message through the school's own SMS account (set up by the
 * platform team in Super Admin → Schools → Communication).
 * Never throws: returns { status: 'sent' | 'failed', provider_message_id,
 * sent_at, error, not_set_up, statusCode } so callers can record the attempt.
 */
import { sendSchoolSms, ChannelNotSetUpError } from './schoolMessenger.js';

export const sendSMS = async (schoolId, phone, message) => {
  try {
    const result = await sendSchoolSms(schoolId, { to: phone, text: message });
    return { status: 'sent', provider_message_id: result.messageId || null, sent_at: new Date(), error: null };
  } catch (error) {
    const notSetUp = error instanceof ChannelNotSetUpError;
    return {
      status: 'failed',
      provider_message_id: null,
      sent_at: null,
      error: error.message || 'SMS could not be sent',
      not_set_up: notSetUp,
      statusCode: notSetUp ? 409 : error.statusCode || 502,
    };
  }
};
