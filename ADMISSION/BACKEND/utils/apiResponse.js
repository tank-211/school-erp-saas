export const sendSuccess = (res, data, message = 'Request completed successfully.', statusCode = 200, meta) => {
  const payload = {
    success: true,
    data,
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
