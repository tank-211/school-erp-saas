import {
  sanitizeApplicationDocumentsPayload,
  sanitizeUploadedDocumentFieldName,
} from '../utils/applicationDocumentTypes.js';

export const validateApplicationDocumentTypes = (req, res, next) => {
  try {
    const rawPayload = req.body?.payload ?? req.body;
    const payload = typeof rawPayload === 'string' ? JSON.parse(rawPayload) : (rawPayload || {});

    if (payload && typeof payload !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Invalid payload format for documents request',
      });
    }

    const sanitizedPayload = {
      ...(payload || {}),
      documents: {},
      photos: payload?.photos && typeof payload.photos === 'object' ? payload.photos : {},
    };

    const {
      sanitizedDocuments,
      invalidTypes,
      mappedTypes,
    } = sanitizeApplicationDocumentsPayload(payload?.documents || {});

    sanitizedPayload.documents = sanitizedDocuments;

    const uploadedFieldChanges = [];

    if (Array.isArray(req.files)) {
      for (const file of req.files) {
        const normalizedFileField = sanitizeUploadedDocumentFieldName(file.fieldname);

        if (normalizedFileField.sanitizedFieldName !== file.fieldname) {
          uploadedFieldChanges.push({
            from: file.fieldname,
            to: normalizedFileField.sanitizedFieldName,
          });
          file.fieldname = normalizedFileField.sanitizedFieldName;
        }

        if (file.fieldname.startsWith('document_') && normalizedFileField.normalizedType) {
          sanitizedPayload.documents[normalizedFileField.normalizedType] =
            sanitizedPayload.documents[normalizedFileField.normalizedType] || {};

          if (normalizedFileField.usedFallback) {
            invalidTypes.push(normalizedFileField.originalType);
          }
        }
      }
    }

    req.validatedPayload = sanitizedPayload;
    req.documentTypeValidation = {
      invalidTypes: Array.from(new Set(invalidTypes)),
      mappedTypes,
      uploadedFieldChanges,
    };

    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: `Invalid documents payload: ${error.message}`,
    });
  }
};
