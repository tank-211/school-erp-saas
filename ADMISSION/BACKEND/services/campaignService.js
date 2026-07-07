import * as communicationQueries from '../db/queries/communicationQueries.js';
import { sendCommunication } from './communicationService.js';
import AppError from '../utils/appError.js';
import {
  assertPositiveInteger,
  assertRequiredString,
  assertValidCampaignStatus,
  assertValidChannel,
  assertValidRecipientType,
} from '../utils/communicationValidation.js';

export const createCampaign = async (schoolId, payload) => {
  assertRequiredString(payload.name, 'name');
  assertValidChannel(payload.channel);
  assertValidCampaignStatus(payload.status || 'draft');

  return communicationQueries.createCampaign(schoolId, {
    name: payload.name.trim(),
    channel: payload.channel,
    status: payload.status || 'draft',
    start_date: payload.start_date || null,
    end_date: payload.end_date || null,
  });
};

export const getCampaigns = async (schoolId, status) => {
  if (status) {
    assertValidCampaignStatus(status);
  }

  return communicationQueries.getCampaigns(schoolId, status);
};

export const sendCampaign = async (schoolId, userId, campaignId, payload) => {
  const id = assertPositiveInteger(campaignId, 'campaign id');
  const campaign = await communicationQueries.getCampaignById(id, schoolId);

  if (!campaign) {
    throw new AppError('Campaign not found.', 404);
  }

  assertValidRecipientType(payload.recipient_type);
  if (!payload.message && !payload.template_id) {
    throw new AppError('message or template_id is required to send a campaign.', 400);
  }

  const recipients = await communicationQueries.getRecipientsByType(
    payload.recipient_type,
    schoolId,
    payload.search?.trim()
  );

  let filteredRecipients = recipients;
  if (Array.isArray(payload.recipient_ids) && payload.recipient_ids.length > 0) {
    const allowedIds = new Set(
      payload.recipient_ids
        .map((value) => Number.parseInt(value, 10))
        .filter((value) => Number.isInteger(value) && value > 0)
    );
    filteredRecipients = recipients.filter((recipient) => allowedIds.has(Number.parseInt(recipient.id, 10)));
  }

  if (filteredRecipients.length === 0) {
    throw new AppError('No recipients found for this campaign send request.', 404);
  }

  await communicationQueries.updateCampaignStatus(id, schoolId, 'running');

  const results = [];
  for (const recipient of filteredRecipients) {
    const sentMessage = await sendCommunication(schoolId, userId, {
      recipient_type: payload.recipient_type,
      recipient_id: recipient.id,
      channel: campaign.channel,
      subject: payload.subject || null,
      message: payload.message,
      template_id: payload.template_id || null,
    });

    results.push({
      communication_id: sentMessage.id,
      recipient_id: recipient.id,
      recipient_name: recipient.name,
      status: sentMessage.status,
      channel: campaign.channel,
    });
  }

  await communicationQueries.updateCampaignStatus(id, schoolId, 'completed');

  return {
    campaign_id: campaign.id,
    campaign_name: campaign.name,
    sent_count: results.length,
    results,
  };
};
