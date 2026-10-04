/**
 * utils/publicError.js — errors that are safe to show to a school user.
 *
 * userError(): something the user can fix (wrong status, duplicate number…).
 * asPublicError(): keeps user errors as they are; turns anything else (for
 * example a database error) into a short message and logs the real one on the
 * server, so database details never reach the browser.
 */
export const userError = (message, status = 400) => {
  const error = new Error(message);
  error.isUserError = true;
  error.status = status;
  return error;
};

const UNIQUE_LABELS = {
  email: 'email address',
  aadhar_number: 'Aadhaar number',
  admission_number: 'admission number',
  registration_number: 'registration number',
};

export const asPublicError = (error, what = 'The request failed') => {
  if (error?.isUserError) return error;

  // Unique constraint: say which value is already in use
  if (error?.code === 'P2002') {
    const target = Array.isArray(error.meta?.target)
      ? error.meta.target
      : String(error.meta?.target || '').split(',');
    const field = target.map((t) => String(t).trim()).find((t) => UNIQUE_LABELS[t]);
    return userError(
      field
        ? `${what}: this ${UNIQUE_LABELS[field]} is already used by another record.`
        : `${what}: one of the values is already used by another record.`,
      409
    );
  }

  console.error(`${what}:`, error);
  const wrapped = new Error(`${what}. Please try again; if it keeps happening, contact support.`);
  wrapped.status = 500;
  return wrapped;
};

/** HTTP status for an error passed through asPublicError / userError. */
export const statusOf = (error) => (Number.isInteger(error?.status) ? error.status : 500);
