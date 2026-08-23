import leadRepository from '../repositories/lead.repository.js';

/**
 * Service: lead
 * Business logic for lead creation / updates.
 */

export const createLeadService = async (data) => {
  const {
    student_name,
    date_of_birth,
    gender,
    grade_applying_for,
    current_school,

    father_name,
    father_occupation,
    father_email,
    father_phone,

    mother_name,
    mother_occupation,
    mother_email,
    mother_phone,

    address,
    city,
    state,
    pin_code,

    lead_source,
    referred_by,
    assigned_to,
    priority,
    additional_notes,

    school_id,
    academic_year_id,
    student_email,
  } = data;

  // Required validations
  const missing = [];
  if (!student_name || !String(student_name).trim()) missing.push('student_name');
  if (!father_phone || !String(father_phone).trim()) missing.push('father_phone');
  if (!lead_source || !String(lead_source).trim()) missing.push('lead_source');
  if (!school_id) missing.push('school_id');
  if (!academic_year_id) missing.push('academic_year_id');

  if (missing.length > 0) {
    const message = `Missing required fields: ${missing.join(', ')}`;
    const error = new Error(message);
    error.status = 400;
    throw error;
  }

  // Split student_name
  const names = String(student_name).trim().split(/\s+/);
  const first_name = names.shift();
  const last_name = names.length > 0 ? names.join(' ') : null;

  // Determine lead contact details
  const email = student_email || father_email || null;
  const phone = String(father_phone).trim();
  const desired_class = grade_applying_for || null;
  const source = lead_source || null;

  // Notes strategy
  const notesObject = {
    ...(date_of_birth ? { dob: date_of_birth } : {}),
    ...(gender ? { gender } : {}),
    ...(current_school ? { current_school } : {}),
    ...(father_name ? { father_name } : {}),
    ...(father_occupation ? { father_occupation } : {}),
    ...(mother_name ? { mother_name } : {}),
    ...(mother_occupation ? { mother_occupation } : {}),
    ...(father_email ? { father_email } : {}),
    ...(mother_email ? { mother_email } : {}),
    ...(mother_phone ? { mother_phone } : {}),
    ...(address ? { address } : {}),
    ...(city ? { city } : {}),
    ...(state ? { state } : {}),
    ...(pin_code ? { pin_code } : {}),
    ...(referred_by ? { referred_by } : {}),
    ...(priority ? { priority } : {}),
    ...(additional_notes ? { additional_notes } : {}),
  };

  const notes = JSON.stringify(notesObject);

  const leadPayload = {
    school_id,
    academic_year_id,
    first_name,
    last_name,
    email,
    phone,
    desired_class,
    source,
    assigned_to,
    notes,
    created_by: 'admin',
  };

  const createdLead = await leadRepository.insertLead(leadPayload);
  return createdLead;
};
