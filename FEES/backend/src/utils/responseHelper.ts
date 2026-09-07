import { Response } from 'express';

export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: any[];
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    pages?: number;
  };
  timestamp: string;
}

const serializeBigInt = (value: any): any => {
  if (typeof value === 'bigint') {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(serializeBigInt);
  }

  if (value !== null && typeof value === 'object') {
    const result: Record<string, any> = {};

    for (const [key, val] of Object.entries(value)) {
      result[key] = serializeBigInt(val);
    }

    return result;
  }

  return value;
};

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200,
  meta?: any
) => {
  const response: ApiResponse = {
    success: true,
    message,
    ...(data !== undefined && {
      data: serializeBigInt(data),
    }),
    ...(meta !== undefined && {
      meta: serializeBigInt(meta),
    }),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  errors?: any[],
  statusCode: number = 400
) => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(errors && errors.length > 0 && { errors }),
    timestamp: new Date().toISOString(),
  };

  res.status(statusCode).json(response);
};

export const getPaginationParams = (query: any) => {
  const page = Math.max(1, parseInt(query.page || '1'));
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '10')));

  return { page, limit, skip: (page - 1) * limit };
};

export const getPaginationMeta = (page: number, limit: number, total: number) => {
  return {
    page,
    limit,
    total,
    pages: Math.ceil(total / limit),
  };
};

export const parseFilters = (query: any) => {
  const filters: Record<string, any> = {};

  // Common filters
  if (query.search) {
    filters.search = query.search;
  }
  if (query.status) {
    filters.status = query.status;
  }
  if (query.startDate || query.endDate) {
    filters.dateRange = {};
    if (query.startDate) {
      filters.dateRange.start = new Date(query.startDate);
    }
    if (query.endDate) {
      filters.dateRange.end = new Date(query.endDate);
    }
  }

  return filters;
};

export const createPaginatedResponse = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
  message: string = '@fetch'
) => {
  return {
    data,
    meta: getPaginationMeta(page, limit, total),
    message,
  };
};
