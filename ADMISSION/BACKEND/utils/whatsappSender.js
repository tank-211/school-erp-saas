/**
 * No WhatsApp provider is connected yet. Report that honestly instead of
 * claiming the message was sent; callers store the attempt as 'failed'.
 * Connect a provider here (e.g. WhatsApp Business API) and return status 'sent'.
 */
export const WHATSAPP_NOT_CONFIGURED = 'WhatsApp is not set up yet: no WhatsApp provider is connected.';

export const sendWhatsApp = async () => ({
  status: 'failed',
  provider_message_id: null,
  sent_at: null,
  error: WHATSAPP_NOT_CONFIGURED,
});
