import winston from 'winston';
import path from 'path';
import fs from 'fs';

const logsDir = path.join(process.cwd(), 'logs');

// Create logs directory if it doesn't exist
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Safely serialize objects containing BigInt
const safeStringify = (value: unknown): string => {
  try {
    return JSON.stringify(
      value,
      (_, currentValue) =>
        typeof currentValue === 'bigint'
          ? currentValue.toString()
          : currentValue,
      2
    );
  } catch {
    return '[Unable to serialize log metadata]';
  }
};

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'debug',

  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss',
    }),
    winston.format.errors({
      stack: true,
    }),
    winston.format.splat(),
    winston.format.json()
  ),

  defaultMeta: {
    service: 'fee-management-api',
  },

  transports: [
    // Error logs
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 10485760,
      maxFiles: 5,
    }),

    // Combined logs
    new winston.transports.File({
      filename: path.join(logsDir, 'app.log'),
      maxsize: 10485760,
      maxFiles: 5,
    }),
  ],
});

// Add console transport in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(
          ({ level, message, timestamp, ...meta }) =>
            `${timestamp} [${level}]: ${message}${
              Object.keys(meta).length
                ? ` ${safeStringify(meta)}`
                : ''
            }`
        )
      ),
    })
  );
}

export default logger;