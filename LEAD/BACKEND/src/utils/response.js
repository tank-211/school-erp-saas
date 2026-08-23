export const successResponse = (data, message = "Success") => {
  return {
    success: true,
    data,
    message,
  };
};

export const errorResponse = (message = "Error", data = null) => {
  return {
    success: false,
    data,
    message,
  };
};
