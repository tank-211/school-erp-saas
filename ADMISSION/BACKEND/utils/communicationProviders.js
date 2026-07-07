import { logInfo } from './logger.js';

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const mockProviderResponse = async (channel, recipient, payload) => {
  await delay(25);

  const providerMessageId = `${channel}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  logInfo(`Mock ${channel} dispatch completed`, {
    providerMessageId,
    recipientId: recipient.id,
    recipientType: recipient.recipient_type,
    subject: payload.subject || null,
  });

  return {
    providerMessageId,
    status: 'sent',
    sentAt: new Date(),
  };
};

export const sendEmail = async (recipient, payload) => mockProviderResponse('email', recipient, payload);
export const sendSMS = async (recipient, payload) => mockProviderResponse('sms', recipient, payload);
export const sendWhatsApp = async (recipient, payload) => mockProviderResponse('whatsapp', recipient, payload);

export const dispatchCommunication = async (channel, recipient, payload) => {
  if (channel === 'email') {
    return sendEmail(recipient, payload);
  }

  if (channel === 'sms') {
    return sendSMS(recipient, payload);
  }

  if (channel === 'whatsapp') {
    return sendWhatsApp(recipient, payload);
  }

  throw new Error(`Unsupported communication channel: ${channel}`);
};
