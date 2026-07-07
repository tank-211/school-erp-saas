import { errorResponse } from "../utils/response.js";

export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal server error";

  res.status(statusCode).json(errorResponse(message));
};

export const notFoundHandler = (req, res) => {
  res.status(404).json(errorResponse("Route not found"));
};
