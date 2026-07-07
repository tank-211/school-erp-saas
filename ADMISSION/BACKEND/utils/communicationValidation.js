import AppError from './appError.js';

export const VALID_RECIPIENT_TYPES = ['lead', 'student', 'parent'];
export const VALID_CHANNELS = ['email', 'sms', 'whatsapp'];
export const VALID_COMMUNICATION_STATUSES = ['sent', 'delivered', 'failed', 'opened', 'clicked'];
export const VALID_CAMPAIGN_STATUSES = ['draft', 'scheduled', 'running', 'completed', 'paused'];

export const assertValidRecipientType = (recipientType) => {
  if (!VALID_RECIPIENT_TYPES.includes(recipientType)) {
    throw new AppError('recipient_type must be one of: lead, student, parent.', 400);
  }
};

export const assertValidChannel = (channel) => {
  if (!VALID_CHANNELS.includes(channel)) {
    throw new AppError('channel must be one of: email, sms, whatsapp.', 400);
  }
};

export const assertValidCommunicationStatus = (status) => {
  if (!VALID_COMMUNICATION_STATUSES.includes(status)) {
    throw new AppError('status must be one of: sent, delivered, failed, opened, clicked.', 400);
  }
};

export const assertValidCampaignStatus = (status) => {
  if (status && !VALID_CAMPAIGN_STATUSES.includes(status)) {
    throw new AppError('campaign status is invalid.', 400);
  }
};

export const assertRequiredString = (value, fieldName) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new AppError(`${fieldName} is required.`, 400);
  }
};

export const assertPositiveInteger = (value, fieldName) => {
  const parsedValue = Number.parseInt(value, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new AppError(`${fieldName} must be a positive integer.`, 400);
  }

  return parsedValue;
};

export const parsePagination = (query = {}) => {
  const page = query.page ? Number.parseInt(query.page, 10) : 1;
  const limit = query.limit ? Number.parseInt(query.limit, 10) : 10;

  if (!Number.isInteger(page) || page <= 0) {
    throw new AppError('page must be a positive integer.', 400);
  }

  if (!Number.isInteger(limit) || limit <= 0 || limit > 100) {
    throw new AppError('limit must be a positive integer up to 100.', 400);
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
  };
};

export const normalizeDateRangeFilters = ({ from_date, to_date }) => {
  if (!from_date && !to_date) {
    return {};
  }

  const filters = {};

  if (from_date) {
    const fromDate = new Date(from_date);
    if (Number.isNaN(fromDate.getTime())) {
      throw new AppError('from_date must be a valid date.', 400);
    }
    filters.from_date = from_date;
  }

  if (to_date) {
    const toDate = new Date(to_date);
    if (Number.isNaN(toDate.getTime())) {
      throw new AppError('to_date must be a valid date.', 400);
    }
    filters.to_date = to_date;
  }

  return filters;
};
