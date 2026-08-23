export const sendWhatsApp = async (phone, message) => {
  console.log('WhatsApp sent:', { phone, message });
  return {
    status: 'sent',
    provider_message_id: `whatsapp-${Date.now()}`,
    sent_at: new Date(),
  };
};
