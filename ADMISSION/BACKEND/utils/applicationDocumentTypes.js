export const VALID_APPLICATION_DOCUMENT_TYPES = [
  'birth_certificate',
  'aadhaar_card',
  'passport_photos',
  'transfer_certificate',
  'previous_report_card',
  'address_proof',
  'parent_id_proof',
  'student_photo',
  'previous_marksheet',
  'aadhar_card',
  'father_id_proof',
  'mother_id_proof',
  'other',
];

const VALID_APPLICATION_DOCUMENT_TYPE_SET = new Set(VALID_APPLICATION_DOCUMENT_TYPES);

const DOCUMENT_TYPE_ALIASES = {
  photo: 'student_photo',
  studentphoto: 'student_photo',
  'student-photo': 'student_photo',
  passport_photo: 'passport_photos',
  'passport-photo': 'passport_photos',
  previous_report: 'previous_report_card',
  previous_reportcard: 'previous_report_card',
  report_card: 'previous_report_card',
  previous_marksheet: 'previous_marksheet',
  marksheet: 'previous_marksheet',
  aadhaar: 'aadhaar_card',
  aadhaarcard: 'aadhaar_card',
  aadhar: 'aadhar_card',
  aadharcard: 'aadhar_card',
  parentidproof: 'parent_id_proof',
  fatheridproof: 'father_id_proof',
  motheridproof: 'mother_id_proof',
};

const normalizeToken = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/\s+/g, '_')
  .replace(/-/g, '_');

export const normalizeApplicationDocumentType = (value, fallbackType = 'other') => {
  const normalizedToken = normalizeToken(value);

  if (!normalizedToken) {
    return {
      original: value,
      normalized: fallbackType,
      isValid: false,
      usedFallback: true,
    };
  }

  if (VALID_APPLICATION_DOCUMENT_TYPE_SET.has(normalizedToken)) {
    return {
      original: value,
      normalized: normalizedToken,
      isValid: true,
      usedFallback: false,
    };
  }

  const aliasResolved = DOCUMENT_TYPE_ALIASES[normalizedToken] || null;
  if (aliasResolved && VALID_APPLICATION_DOCUMENT_TYPE_SET.has(aliasResolved)) {
    return {
      original: value,
      normalized: aliasResolved,
      isValid: true,
      usedFallback: false,
    };
  }

  return {
    original: value,
    normalized: fallbackType,
    isValid: false,
    usedFallback: true,
  };
};

export const sanitizeApplicationDocumentsPayload = (documentsPayload = {}) => {
  const sanitizedDocuments = {};
  const invalidTypes = [];
  const mappedTypes = [];

  if (!documentsPayload || typeof documentsPayload !== 'object') {
    return { sanitizedDocuments, invalidTypes, mappedTypes };
  }

  for (const [rawType, value] of Object.entries(documentsPayload)) {
    const normalized = normalizeApplicationDocumentType(rawType);

    if (normalized.usedFallback) {
      invalidTypes.push(String(rawType));
    } else if (normalized.normalized !== rawType) {
      mappedTypes.push({ from: String(rawType), to: normalized.normalized });
    }

    if (!(normalized.normalized in sanitizedDocuments) || value) {
      sanitizedDocuments[normalized.normalized] = value;
    }
  }

  return { sanitizedDocuments, invalidTypes, mappedTypes };
};

export const sanitizeUploadedDocumentFieldName = (fieldName) => {
  const rawFieldName = String(fieldName || '');

  if (rawFieldName.startsWith('document_')) {
    const rawType = rawFieldName.slice('document_'.length);
    const normalized = normalizeApplicationDocumentType(rawType);
    return {
      sanitizedFieldName: `document_${normalized.normalized}`,
      normalizedType: normalized.normalized,
      isValid: normalized.isValid,
      usedFallback: normalized.usedFallback,
      originalType: rawType,
    };
  }

  return {
    sanitizedFieldName: rawFieldName,
    normalizedType: null,
    isValid: true,
    usedFallback: false,
    originalType: rawFieldName,
  };
};
