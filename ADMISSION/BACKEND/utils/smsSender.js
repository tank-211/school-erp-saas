/**
 * No SMS provider is connected yet. Report that honestly instead of claiming
 * the message was sent; callers store the attempt as 'failed'.
 * Connect a provider here (e.g. MSG91, Twilio) and return status 'sent'.
 */
export const SMS_NOT_CONFIGURED = 'SMS is not set up yet: no SMS provider is connected.';

export const sendSMS = async () => ({
  status: 'failed',
  provider_message_id: null,
  sent_at: null,
  error: SMS_NOT_CONFIGURED,
});
