export const logInfo = (message, meta = {}) => {
  console.log(`[INFO] ${new Date().toISOString()} ${message}`, meta);
};

export const logError = (message, meta = {}) => {
  console.error(`[ERROR] ${new Date().toISOString()} ${message}`, meta);
};
