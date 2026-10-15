import { serializeBigInt } from './bigintSerializer.js';

export const sendSuccess = (res, data, message = 'Request completed successfully.', statusCode = 200, meta) => {
  // BigInt ids (e.g. a saved communication_log row) cannot go through
  // res.json as they are; they are sent as strings, like everywhere else.
  const payload = {
    success: true,
    data: data === undefined ? undefined : serializeBigInt(data),
    message,
  };

  if (meta) {
    payload.meta = meta;
  }

  return res.status(statusCode).json(payload);
};

export const sendError = (res, message = 'Something went wrong.', statusCode = 500, details) => {
  const payload = {
    success: false,
    message,
  };

  if (details) {
    payload.details = details;
  }

  return res.status(statusCode).json(payload);
};
