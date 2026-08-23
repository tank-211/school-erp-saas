export const sendSMS = async (phone, message) => {
  console.log('SMS sent:', { phone, message });
  return {
    status: 'sent',
    provider_message_id: `sms-${Date.now()}`,
    sent_at: new Date(),
  };
};
