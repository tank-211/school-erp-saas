/**
 * utils/studentImport.js — imports a school's EXISTING students (students who
 * were admitted before the school started using the ERP).
 *
 * One spreadsheet row = one student, with their class, parents, fee position
 * (total fee, amount already paid) and which documents the school already has.
 * Each row becomes:
 *   student + parent_detail (father / mother)
 *   admission (completed, type "regular"; class/section may be left empty =
 *              "class pending")
 *   student_fee_assignment for the class's fee structures (when the class has any)
 *   invoice for the total fee, and one opening payment for the amount already paid
 *   documents rows for documents marked "Yes" (a physical copy; a scan can be
 *              uploaded later)
 * All rows of one import are written in ONE transaction and recorded in
 * student_import_batch, so a wrong import can be undone.
 *
 * This file has no imports: the caller passes its Prisma client. The same file
 * is used by ADMISSION/BACKEND/utils/studentImport.js (school admins) and
 * SUPER-ADMIN/BACKEND/utils/studentImport.mjs (platform team); keep them identical.
 */

export const MAX_IMPORT_ROWS = 1000;

// Columns of the template, in order. key -> header shown to the school.
export const COLUMNS = [
  { key: 'admission_number', header: 'Admission No*', example: 'ADM-2024-001' },
  { key: 'first_name', header: 'Student First Name*', example: 'Aarav' },
  { key: 'middle_name', header: 'Middle Name', example: '' },
  { key: 'last_name', header: 'Last Name', example: 'Patil' },
  { key: 'date_of_birth', header: 'Date of Birth (DD-MM-YYYY)', example: '14-06-2016' },
  { key: 'gender', header: 'Gender (Male/Female/Other)', example: 'Male' },
  { key: 'class_name', header: 'Class (leave empty if not decided)', example: 'Class 3' },
  { key: 'section_name', header: 'Section', example: 'A' },
  { key: 'academic_year', header: 'Academic Year (empty = current)', example: '' },
  { key: 'admission_date', header: 'Admission Date (DD-MM-YYYY)', example: '10-06-2022' },
  { key: 'father_name', header: 'Father Name', example: 'Rahul Patil' },
  { key: 'father_phone', header: 'Father Phone', example: '9876543210' },
  { key: 'father_email', header: 'Father Email', example: 'rahul.patil@example.com' },
  { key: 'mother_name', header: 'Mother Name', example: 'Sneha Patil' },
  { key: 'mother_phone', header: 'Mother Phone', example: '' },
  { key: 'mother_email', header: 'Mother Email', example: '' },
  { key: 'address', header: 'Address', example: '12 MG Road' },
  { key: 'city', header: 'City', example: 'Nashik' },
  { key: 'previous_school', header: 'Previous School', example: '' },
  { key: 'total_fee', header: 'Total Fee This Year (Rs)', example: '15000' },
  { key: 'amount_paid', header: 'Amount Already Paid (Rs)', example: '8000' },
  { key: 'last_payment_date', header: 'Last Payment Date (DD-MM-YYYY)', example: '05-07-2026' },
  { key: 'payment_mode', header: 'Paid By (Cash/UPI/Cheque/Card/Net Banking)', example: 'Cash' },
  { key: 'fee_due_date', header: 'Balance Due Date (DD-MM-YYYY)', example: '31-12-2026' },
  { key: 'doc_birth_certificate', header: 'Birth Certificate (Yes/No)', example: 'Yes', document: 'birth_certificate' },
  { key: 'doc_aadhaar_card', header: 'Aadhaar Card (Yes/No)', example: 'Yes', document: 'aadhaar_card' },
  { key: 'doc_passport_photos', header: 'Passport Photos (Yes/No)', example: 'Yes', document: 'passport_photos' },
  { key: 'doc_transfer_certificate', header: 'Transfer Certificate (Yes/No)', example: 'No', document: 'transfer_certificate' },
  { key: 'doc_previous_report_card', header: 'Previous Report Card (Yes/No)', example: 'No', document: 'previous_report_card' },
  { key: 'doc_address_proof', header: 'Address Proof (Yes/No)', example: 'Yes', document: 'address_proof' },
  { key: 'doc_parent_id_proof', header: 'Parent ID Proof (Yes/No)', example: 'Yes', document: 'parent_id_proof' },
];

export const DOCUMENT_COLUMNS = COLUMNS.filter((c) => c.document);
export const DOCUMENT_LABELS = Object.fromEntries(
  DOCUMENT_COLUMNS.map((c) => [c.document, c.header.replace(/\s*\(Yes\/No\)/, '')])
);

// Same labels the Fees app stores when staff record a payment
const PAYMENT_MODES = {
  cash: 'Cash',
  upi: 'UPI',
  gpay: 'UPI',
  phonepe: 'UPI',
  paytm: 'UPI',
  cheque: 'Cheque',
  check: 'Cheque',
  card: 'Debit Card',
  debitcard: 'Debit Card',
  creditcard: 'Credit Card',
  netbanking: 'Net Banking',
  banktransfer: 'Net Banking',
  neft: 'Net Banking',
  rtgs: 'Net Banking',
  imps: 'Net Banking',
};
export const OPENING_PAYMENT_METHOD = 'Opening balance';

const DAY_MS = 24 * 60 * 60 * 1000;

/* ---------- reading the sheet ---------- */

// "Admission No*", "admission_no", "Admission No (required)" -> "admissionno"
const headerKey = (value) =>
  String(value ?? '')
    .replace(/^﻿/, '')
    .replace(/\(.*?\)/g, '')
    .replace(/[*:]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

const HEADER_ALIASES = (() => {
  const map = new Map();
  for (const c of COLUMNS) {
    map.set(headerKey(c.header), c.key);
    map.set(headerKey(c.key), c.key);
  }
  const extra = {
    admissionnumber: 'admission_number',
    admno: 'admission_number',
    studentname: 'first_name',
    firstname: 'first_name',
    dob: 'date_of_birth',
    birthdate: 'date_of_birth',
    class: 'class_name',
    grade: 'class_name',
    section: 'section_name',
    div: 'section_name',
    division: 'section_name',
    year: 'academic_year',
    totalfee: 'total_fee',
    fee: 'total_fee',
    paid: 'amount_paid',
    amountpaid: 'amount_paid',
    paymentmode: 'payment_mode',
    paidby: 'payment_mode',
    duedate: 'fee_due_date',
    aadhar: 'doc_aadhaar_card',
    aadharcard: 'doc_aadhaar_card',
    photo: 'doc_passport_photos',
    photos: 'doc_passport_photos',
    tc: 'doc_transfer_certificate',
    reportcard: 'doc_previous_report_card',
    marksheet: 'doc_previous_report_card',
  };
  for (const [k, v] of Object.entries(extra)) if (!map.has(k)) map.set(k, v);
  return map;
})();

const text = (value, max = 255) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/\s+/g, ' ').trim().slice(0, max);
};

/** Raw sheet rows (objects keyed by the sheet's headers) -> rows keyed by column key. */
export const normalizeSheetRows = (rawRows = []) =>
  rawRows.map((raw) => {
    const row = {};
    for (const [header, value] of Object.entries(raw || {})) {
      const key = HEADER_ALIASES.get(headerKey(header));
      if (key && (row[key] === undefined || row[key] === '')) row[key] = value;
    }
    return row;
  });

const isBlankRow = (row) => COLUMNS.every((c) => text(row[c.key]) === '');

/* ---------- value parsers ---------- */

const pad2 = (n) => String(n).padStart(2, '0');
const utcDate = (y, m, d) => {
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d ? date : null;
};

/** DD-MM-YYYY, DD/MM/YYYY, DD.MM.YYYY, YYYY-MM-DD, or an Excel date number. */
export const parseDate = (value) => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return utcDate(value.getFullYear(), value.getMonth() + 1, value.getDate());
  }
  const raw = text(value, 40);
  if (!raw) return null;
  let m = raw.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2}|\d{4})$/);
  if (m) {
    let year = Number(m[3]);
    if (m[3].length === 2) year += year > 50 ? 1900 : 2000;
    return utcDate(year, Number(m[2]), Number(m[1])) || undefined; // 31-02-2016 is not a date
  }
  m = raw.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/);
  if (m) return utcDate(Number(m[1]), Number(m[2]), Number(m[3])) || undefined;
  if (/^\d{4,5}(\.\d+)?$/.test(raw)) {
    // Excel serial date (days since 1899-12-30)
    const serial = Math.floor(Number(raw));
    if (serial > 0 && serial < 80000) {
      const d = new Date(Date.UTC(1899, 11, 30) + serial * DAY_MS);
      return utcDate(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
  }
  return undefined; // present but not a date
};

const formatDate = (d) => (d ? `${pad2(d.getUTCDate())}-${pad2(d.getUTCMonth() + 1)}-${d.getUTCFullYear()}` : '');

/** Amount in rupees -> paise (integer), null when empty, undefined when invalid. */
const parseMoney = (value) => {
  const raw = text(value, 40).replace(/(rs\.?|inr|₹|,|\s)/gi, '');
  if (!raw) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(raw)) return undefined;
  return Math.round(Number(raw) * 100);
};
const rupees = (paise) => (paise / 100).toFixed(2);

/** Indian mobile: 10 digits (a leading +91 / 91 / 0 is removed). */
const parsePhone = (value) => {
  let digits = text(value, 30).replace(/\D/g, '');
  if (!digits) return null;
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^\d{10}$/.test(digits) ? digits : undefined;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const parseGender = (value) => {
  const v = text(value, 20).toLowerCase();
  if (!v) return null;
  if (['m', 'male', 'boy'].includes(v)) return 'Male';
  if (['f', 'female', 'girl'].includes(v)) return 'Female';
  if (['o', 'other', 'others'].includes(v)) return 'Other';
  return undefined;
};

const parseYesNo = (value) => {
  const v = text(value, 20).toLowerCase();
  if (!v || ['no', 'n', 'pending', 'not submitted', '0', 'false', '-', 'na', 'n/a'].includes(v)) return false;
  if (['yes', 'y', 'received', 'submitted', 'done', '1', 'true', '✓', '✔', 'ok'].includes(v)) return true;
  return undefined;
};

const parseMode = (value) => {
  const v = text(value, 40).toLowerCase().replace(/[^a-z]/g, '');
  if (!v) return null;
  return PAYMENT_MODES[v] || undefined;
};

// "3", "class 3", "Class-3", "III" style matching against the school's classes
const classKey = (value) => text(value, 100).toLowerCase().replace(/^(class|std|standard|grade)\s*[-.]?\s*/, '').replace(/\s+/g, ' ');

/* ---------- school data ---------- */

/** Classes, sections, academic years and fee structures of one school. */
export const loadSchoolLookups = async (db, schoolId) => {
  const sid = BigInt(schoolId);
  const [years, classes, sections, structures] = await Promise.all([
    db.academic_year.findMany({ where: { school_id: sid }, select: { id: true, year_name: true, status: true, is_active: true, start_date: true } }),
    db.school_class.findMany({ where: { school_id: sid }, select: { id: true, class_name: true, class_numeric_value: true }, orderBy: { class_numeric_value: 'asc' } }),
    db.section.findMany({ where: { school_id: sid }, select: { id: true, class_id: true, section_name: true } }),
    db.fee_structure.findMany({
      where: { school_id: sid, OR: [{ is_active: true }, { is_active: null }] },
      select: { id: true, class_id: true, academic_year_id: true, fee_type: true, amount: true, due_date: true },
    }),
  ]);
  const current =
    years.find((y) => String(y.status || '').toLowerCase() === 'active') ||
    years.find((y) => y.is_active === true) ||
    null;
  return { years, classes, sections, structures, currentYear: current };
};

const findClass = (lookups, value) => {
  const wanted = text(value, 100);
  if (!wanted) return null;
  const lower = wanted.toLowerCase();
  const exact = lookups.classes.find((c) => c.class_name.trim().toLowerCase() === lower);
  if (exact) return exact;
  const key = classKey(wanted);
  const byKey = lookups.classes.filter((c) => classKey(c.class_name) === key);
  if (byKey.length === 1) return byKey[0];
  if (/^\d+$/.test(key)) {
    const byNumber = lookups.classes.filter((c) => Number(c.class_numeric_value) === Number(key));
    if (byNumber.length === 1) return byNumber[0];
  }
  return undefined;
};

/* ---------- validation ---------- */

/**
 * Checks every row against the school's data. Nothing is written.
 * Returns { rows: [{ row, admission_number, name, errors, warnings, plan }], counts }.
 */
export const validateImport = async (db, schoolId, sheetRows) => {
  const sid = BigInt(schoolId);
  const lookups = await loadSchoolLookups(db, sid);
  const rows = normalizeSheetRows(sheetRows)
    .map((data, index) => ({ data, rowNumber: index + 2 })) // row 1 is the header
    .filter((r) => !isBlankRow(r.data));

  const numbers = [...new Set(rows.map((r) => text(r.data.admission_number, 50)).filter(Boolean))];
  const existing = numbers.length
    ? await db.student.findMany({ where: { school_id: sid, admission_number: { in: numbers } }, select: { admission_number: true } })
    : [];
  const taken = new Set(existing.map((s) => s.admission_number.toLowerCase()));
  const seen = new Map();
  const today = startOfToday();

  const results = rows.map(({ data, rowNumber }) => {
    const errors = [];
    const warnings = [];
    const plan = {};

    // Student
    const admissionNumber = text(data.admission_number, 50);
    const firstName = text(data.first_name, 100);
    if (!admissionNumber) errors.push('Admission No is missing.');
    else if (taken.has(admissionNumber.toLowerCase())) errors.push(`Admission No ${admissionNumber} already exists in this school.`);
    else if (seen.has(admissionNumber.toLowerCase())) errors.push(`Admission No ${admissionNumber} is also on row ${seen.get(admissionNumber.toLowerCase())}.`);
    if (admissionNumber) seen.set(admissionNumber.toLowerCase(), seen.get(admissionNumber.toLowerCase()) || rowNumber);
    if (!firstName) errors.push('Student first name is missing.');

    const dob = parseDate(data.date_of_birth);
    if (dob === undefined) errors.push(`Date of birth "${text(data.date_of_birth, 20)}" is not a date (use DD-MM-YYYY).`);
    else if (dob && dob > today) errors.push('Date of birth is in the future.');
    const gender = parseGender(data.gender);
    if (gender === undefined) errors.push(`Gender "${text(data.gender, 20)}" must be Male, Female or Other.`);

    plan.student = {
      admission_number: admissionNumber,
      first_name: firstName,
      middle_name: text(data.middle_name, 100) || null,
      last_name: text(data.last_name, 100) || null,
      date_of_birth: dob || null,
      gender: gender || null,
      address: text(data.address, 500) || null,
      city: text(data.city, 100) || null,
    };

    // Academic year
    const yearName = text(data.academic_year, 50);
    let year = null;
    if (yearName) {
      year = lookups.years.find((y) => y.year_name.trim().toLowerCase() === yearName.toLowerCase()) || null;
      if (!year) errors.push(`Academic year "${yearName}" is not set up for this school.`);
    } else {
      year = lookups.currentYear;
      if (!year) errors.push('No current academic year is set for this school; fill the Academic Year column or set one in School Setup.');
    }

    // Class and section (both may be empty: class pending)
    const className = text(data.class_name, 100);
    const sectionName = text(data.section_name, 50);
    let cls = null;
    let section = null;
    if (className) {
      cls = findClass(lookups, className);
      if (cls === undefined) {
        errors.push(`Class "${className}" is not set up for this school.`);
        cls = null;
      }
    }
    if (cls) {
      const classSections = lookups.sections.filter((s) => String(s.class_id) === String(cls.id));
      if (sectionName) {
        section = classSections.find((s) => s.section_name.trim().toLowerCase() === sectionName.toLowerCase()) || null;
        if (!section) errors.push(`Section "${sectionName}" does not exist in ${cls.class_name}.`);
      } else if (classSections.length === 1) {
        section = classSections[0];
      } else {
        warnings.push('No section given: the student is imported with section pending.');
      }
    } else if (!className && sectionName) {
      errors.push('A section is given without a class.');
    } else if (!className) {
      warnings.push('No class given: the student is imported as "class pending".');
    }

    const admissionDate = parseDate(data.admission_date);
    if (admissionDate === undefined) errors.push(`Admission date "${text(data.admission_date, 20)}" is not a date (use DD-MM-YYYY).`);
    else if (admissionDate && admissionDate > today) errors.push('Admission date is in the future.');

    plan.admission = {
      academic_year_id: year?.id ?? null,
      year_name: year?.year_name ?? null,
      class_id: cls?.id ?? null,
      class_name: cls?.class_name ?? null,
      section_id: section?.id ?? null,
      section_name: section?.section_name ?? null,
      admission_date: admissionDate || today,
      previous_school: text(data.previous_school, 255) || null,
    };

    // Parents: each one given needs a name and a valid phone; at least one parent
    plan.parents = [];
    for (const [relation, prefix] of [['Father', 'father'], ['Mother', 'mother']]) {
      const name = text(data[`${prefix}_name`], 200);
      const rawPhone = text(data[`${prefix}_phone`], 30);
      const email = text(data[`${prefix}_email`], 100);
      if (!name && !rawPhone && !email) continue;
      const phone = parsePhone(rawPhone);
      if (!name) errors.push(`${relation} name is missing (phone or email is given).`);
      if (!rawPhone) errors.push(`${relation} phone is missing.`);
      else if (phone === undefined) errors.push(`${relation} phone "${rawPhone}" is not a 10-digit mobile number.`);
      if (email && !EMAIL.test(email)) errors.push(`${relation} email "${email}" is not valid.`);
      const [first, ...rest] = name.split(' ');
      plan.parents.push({
        relation,
        first_name: (first || '').slice(0, 100),
        last_name: rest.join(' ').slice(0, 100) || null,
        phone: phone || null,
        email: email && EMAIL.test(email) ? email.toLowerCase() : null,
      });
    }
    if (!plan.parents.length) errors.push('Add at least the father or the mother (name and phone).');

    // Fees: total, amount already paid, when and how
    const structures = cls && year
      ? lookups.structures.filter((s) => String(s.class_id) === String(cls.id) && String(s.academic_year_id) === String(year.id))
      : [];
    const structuresPaise = structures.reduce((sum, s) => sum + Math.round(Number(s.amount || 0) * 100), 0);
    let total = parseMoney(data.total_fee);
    const paid = parseMoney(data.amount_paid);
    if (total === undefined) errors.push(`Total fee "${text(data.total_fee, 20)}" is not an amount.`);
    if (paid === undefined) errors.push(`Amount paid "${text(data.amount_paid, 20)}" is not an amount.`);
    if (total === null && structuresPaise > 0) {
      total = structuresPaise;
      warnings.push(`Total fee taken from the ${cls.class_name} fee structure: Rs ${rupees(structuresPaise)}.`);
    }
    const totalOk = typeof total === 'number' ? total : 0;
    const paidOk = typeof paid === 'number' ? paid : 0;
    if (paidOk > 0 && totalOk <= 0) errors.push('Amount paid is given but there is no total fee.');
    if (paidOk > totalOk && totalOk > 0) errors.push(`Amount paid (Rs ${rupees(paidOk)}) is more than the total fee (Rs ${rupees(totalOk)}).`);

    const lastPaid = parseDate(data.last_payment_date);
    if (lastPaid === undefined) errors.push(`Last payment date "${text(data.last_payment_date, 20)}" is not a date (use DD-MM-YYYY).`);
    else if (lastPaid && lastPaid > today) errors.push('Last payment date is in the future.');
    if (paidOk > 0 && !lastPaid && lastPaid !== undefined) errors.push('Last payment date is needed when an amount is already paid.');

    const mode = parseMode(data.payment_mode);
    if (mode === undefined) errors.push(`Paid by "${text(data.payment_mode, 30)}" must be Cash, UPI, Cheque, Card or Net Banking.`);

    const dueDate = parseDate(data.fee_due_date);
    if (dueDate === undefined) errors.push(`Balance due date "${text(data.fee_due_date, 20)}" is not a date (use DD-MM-YYYY).`);

    if (totalOk > 0 && structures.length && structuresPaise !== totalOk) {
      warnings.push(`Total fee Rs ${rupees(totalOk)} differs from the ${cls.class_name} fee structure (Rs ${rupees(structuresPaise)}); the sheet's total is used.`);
    }
    if (totalOk <= 0) warnings.push('No fee: no invoice is created (fees can be assigned later in Fees).');

    plan.fees = {
      total_paise: totalOk,
      paid_paise: paidOk,
      balance_paise: Math.max(0, totalOk - paidOk),
      last_payment_date: lastPaid || null,
      payment_method: mode || OPENING_PAYMENT_METHOD,
      due_date: dueDate || null,
      structures: structures.map((s) => ({ id: s.id, fee_type: s.fee_type, amount: s.amount, due_date: s.due_date })),
    };

    // Documents (Yes = the school has a copy)
    plan.documents_received = [];
    plan.documents_pending = [];
    for (const col of DOCUMENT_COLUMNS) {
      const v = parseYesNo(data[col.key]);
      if (v === undefined) errors.push(`${DOCUMENT_LABELS[col.document]}: "${text(data[col.key], 20)}" must be Yes or No.`);
      (v ? plan.documents_received : plan.documents_pending).push(col.document);
    }

    const feeStatus =
      totalOk <= 0 ? 'no_fee' : paidOk >= totalOk ? 'paid' : paidOk > 0 ? 'partial' : 'unpaid';

    return {
      row: rowNumber,
      admission_number: admissionNumber,
      name: [firstName, plan.student.last_name].filter(Boolean).join(' '),
      class_label: cls ? `${cls.class_name}${section ? ` ${section.section_name}` : ' (section pending)'}` : 'Class pending',
      fee_status: feeStatus,
      total: rupees(totalOk),
      paid: rupees(paidOk),
      balance: rupees(Math.max(0, totalOk - paidOk)),
      documents_pending: plan.documents_pending.length,
      errors,
      warnings,
      plan,
    };
  });

  const ok = results.filter((r) => !r.errors.length);
  const counts = {
    rows: results.length,
    ready: ok.length,
    with_errors: results.length - ok.length,
    class_pending: ok.filter((r) => !r.plan.admission.class_id).length,
    paid: ok.filter((r) => r.fee_status === 'paid').length,
    partial: ok.filter((r) => r.fee_status === 'partial').length,
    unpaid: ok.filter((r) => r.fee_status === 'unpaid').length,
    no_fee: ok.filter((r) => r.fee_status === 'no_fee').length,
    documents_pending: ok.filter((r) => r.documents_pending > 0).length,
    total_fee: rupees(ok.reduce((s, r) => s + r.plan.fees.total_paise, 0)),
    total_paid: rupees(ok.reduce((s, r) => s + r.plan.fees.paid_paise, 0)),
  };
  if (!results.length) counts.empty = true;
  if (results.length > MAX_IMPORT_ROWS) counts.too_many = MAX_IMPORT_ROWS;
  return { rows: results, counts };
};

/** What the preview screen shows (no internal ids). */
export const previewForClient = (result) => ({
  counts: result.counts,
  rows: result.rows.map(({ plan, ...rest }) => rest),
});

/* ---------- import ---------- */

function startOfToday() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export class ImportError extends Error {
  constructor(message, status = 400, details = undefined) {
    super(message);
    this.name = 'ImportError';
    this.status = status;
    this.statusCode = status;
    this.details = details;
  }
}

const unique = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36).padStart(2, '0')}`.toUpperCase();

/**
 * Validates again and writes every row in one transaction. Refuses the whole
 * file when any row has an error (the preview lists them).
 * Returns { batch_id, student_count, class_pending_count, invoice_total, paid_total }.
 */
export const commitImport = async (db, { schoolId, sheetRows, fileName, actor }) => {
  const sid = BigInt(schoolId);
  const result = await validateImport(db, sid, sheetRows);
  if (result.counts.empty) throw new ImportError('The file has no student rows.');
  if (result.counts.too_many) throw new ImportError(`At most ${MAX_IMPORT_ROWS} students can be imported at once; split the file.`);
  const bad = result.rows.filter((r) => r.errors.length);
  if (bad.length) {
    throw new ImportError(
      `${bad.length} row(s) have problems. Fix them in the file and upload it again; nothing was imported.`,
      400,
      bad.slice(0, 50).map((r) => ({ row: r.row, admission_number: r.admission_number, errors: r.errors }))
    );
  }

  const rows = result.rows;
  const by = actor ? String(actor).slice(0, 100) : null;
  const tag = unique();
  const today = startOfToday();
  const now = new Date();

  const write = async (tx) => {
    // 1. Students
    const students = await tx.student.createManyAndReturn({
      data: rows.map((r) => ({ school_id: sid, ...r.plan.student, status: 'active', created_by: by })),
      select: { id: true, admission_number: true },
    });
    const studentId = new Map(students.map((s) => [s.admission_number, s.id]));
    const idOf = (r) => studentId.get(r.plan.student.admission_number);

    // 2. Parents
    const parents = rows.flatMap((r) =>
      r.plan.parents.map((p) => ({
        school_id: sid,
        student_id: idOf(r),
        relation: p.relation,
        first_name: p.first_name,
        last_name: p.last_name,
        phone: p.phone,
        email: p.email,
        address: r.plan.student.address,
        city: r.plan.student.city,
      }))
    );
    if (parents.length) await tx.parent_detail.createMany({ data: parents });

    // 3. Admissions (completed; class/section may be empty = class pending)
    const admissions = await tx.admission.createManyAndReturn({
      data: rows.map((r) => ({
        school_id: sid,
        student_id: idOf(r),
        academic_year_id: r.plan.admission.academic_year_id,
        class_id: r.plan.admission.class_id,
        section_id: r.plan.admission.section_id,
        admission_date: r.plan.admission.admission_date,
        status: 'active',
        is_completed: true,
        admission_type: 'regular',
        previous_school: r.plan.admission.previous_school,
        created_by: by,
      })),
      select: { id: true, student_id: true },
    });
    const admissionOf = new Map(admissions.map((a) => [String(a.student_id), a.id]));
    const admissionId = (r) => admissionOf.get(String(idOf(r)));

    // 4. Fee assignments for the class's fee structures
    const assignments = rows.flatMap((r) =>
      r.plan.fees.structures.map((s) => ({
        school_id: sid,
        student_id: idOf(r),
        admission_id: admissionId(r),
        fee_structure_id: s.id,
        amount: s.amount,
        due_date: s.due_date || null,
        concession_percentage: 0,
        concession_amount: 0,
        final_amount: s.amount,
        status: r.plan.fees.total_paise > 0 ? 'invoiced' : 'pending',
      }))
    );
    if (assignments.length) await tx.student_fee_assignment.createMany({ data: assignments });

    // 5. One invoice per student with a fee; 6. the amount already paid as one opening payment
    const billed = rows.filter((r) => r.plan.fees.total_paise > 0);
    const invoiceNumber = (i) => `INV-${tag}-${String(i + 1).padStart(4, '0')}`;
    const invoices = billed.length
      ? await tx.invoice.createManyAndReturn({
          data: billed.map((r, i) => {
            const f = r.plan.fees;
            const status = f.paid_paise >= f.total_paise ? 'paid' : f.paid_paise > 0 ? 'partial' : 'unpaid';
            const due = f.due_date || (f.balance_paise > 0 ? new Date(today.getTime() + 15 * DAY_MS) : today);
            const types = r.plan.fees.structures.map((s) => s.fee_type);
            return {
              school_id: sid,
              student_id: idOf(r),
              invoice_number: invoiceNumber(i),
              invoice_date: today,
              due_date: due,
              total_amount: rupees(f.total_paise),
              paid_amount: rupees(f.paid_paise),
              pending_amount: rupees(f.balance_paise),
              status,
              notes: `Fees from the school's records before the ERP (import ${tag})${types.length ? `: ${types.join(', ')}` : ''}`,
              created_by: by,
            };
          }),
          select: { id: true, invoice_number: true },
        })
      : [];
    const invoiceIdByNumber = new Map(invoices.map((inv) => [inv.invoice_number, inv.id]));

    const payments = billed
      .map((r, i) => ({ r, i }))
      .filter(({ r }) => r.plan.fees.paid_paise > 0)
      .map(({ r, i }) => {
        const f = r.plan.fees;
        return {
          school_id: sid,
          student_id: idOf(r),
          invoice_id: invoiceIdByNumber.get(invoiceNumber(i)),
          payment_number: `OPEN-${tag}-${String(i + 1).padStart(4, '0')}`,
          amount: rupees(f.paid_paise),
          payment_date: f.last_payment_date,
          payment_method: f.payment_method,
          status: f.paid_paise >= f.total_paise ? 'paid' : 'partial',
          remarks: `Paid before the ERP; total paid up to ${formatDate(f.last_payment_date)} (import ${tag})`,
          received_by: by,
        };
      });
    if (payments.length) await tx.payment.createMany({ data: payments });

    // 7. Documents the school already has (physical copy; a scan can be added later)
    const documents = rows.flatMap((r) =>
      r.plan.documents_received.map((type) => ({
        admission_id: admissionId(r),
        document_type: type,
        file_name: 'Physical copy (imported)',
        file_path: '',
        uploaded_by: by,
      }))
    );
    if (documents.length) await tx.documents.createMany({ data: documents });

    // 8. The import itself, for history and undo
    const totals = rows.reduce(
      (t, r) => ({ total: t.total + r.plan.fees.total_paise, paid: t.paid + r.plan.fees.paid_paise }),
      { total: 0, paid: 0 }
    );
    const batch = await tx.student_import_batch.create({
      data: {
        school_id: sid,
        file_name: fileName ? String(fileName).slice(0, 255) : null,
        created_by: by,
        created_at: now,
        student_count: rows.length,
        class_pending_count: rows.filter((r) => !r.plan.admission.class_id).length,
        invoice_total: rupees(totals.total),
        paid_total: rupees(totals.paid),
        student_ids: students.map((s) => String(s.id)),
        status: 'imported',
      },
      select: { id: true },
    });

    return {
      batch_id: String(batch.id),
      student_count: rows.length,
      class_pending_count: rows.filter((r) => !r.plan.admission.class_id).length,
      documents_pending_count: rows.filter((r) => r.plan.documents_pending.length).length,
      invoice_total: rupees(totals.total),
      paid_total: rupees(totals.paid),
    };
  };

  try {
    return await db.$transaction(write, { maxWait: 10000, timeout: 60000 });
  } catch (error) {
    if (error instanceof ImportError) throw error;
    if (error?.code === 'P2002') {
      throw new ImportError(
        'An admission number in the file is already used. If it is not in this school, the database update for imports has not been run yet (prisma/sql/2026-10-22_existing_student_import.sql).',
        409
      );
    }
    if (error?.code === 'P2021' || /student_import_batch/.test(String(error?.message))) {
      throw new ImportError('Student import is not set up in the database yet. Run prisma/sql/2026-10-22_existing_student_import.sql in Neon.', 501);
    }
    if (/null value in column "(class_id|section_id)"/.test(String(error?.message))) {
      throw new ImportError('Students without a class cannot be saved until the database update for imports is run (prisma/sql/2026-10-22_existing_student_import.sql).', 501);
    }
    throw error;
  }
};

/* ---------- history and undo ---------- */

const idList = (value) => (Array.isArray(value) ? value : []).filter((v) => /^\d+$/.test(String(v))).map((v) => BigInt(v));

export const listBatches = async (db, schoolId) => {
  const batches = await db.student_import_batch.findMany({
    where: { school_id: BigInt(schoolId) },
    orderBy: { created_at: 'desc' },
    take: 50,
  });
  return batches.map((b) => ({
    id: String(b.id),
    file_name: b.file_name,
    created_by: b.created_by,
    created_at: b.created_at,
    student_count: b.student_count,
    class_pending_count: b.class_pending_count,
    invoice_total: String(b.invoice_total),
    paid_total: String(b.paid_total),
    status: b.status,
    undone_at: b.undone_at,
    undone_by: b.undone_by,
  }));
};

/**
 * Removes the students an import created (their admissions, parents, fees,
 * opening payments and documents go with them). Refused once anything new has
 * happened to those students, e.g. a fee was collected after the import.
 */
export const undoBatch = async (db, { schoolId, batchId, actor }) => {
  const sid = BigInt(schoolId);
  if (!/^\d+$/.test(String(batchId ?? ''))) throw new ImportError('Invalid import id.', 400);
  const batch = await db.student_import_batch.findFirst({ where: { id: BigInt(batchId), school_id: sid } });
  if (!batch) throw new ImportError('Import not found.', 404);
  if (batch.status !== 'imported') throw new ImportError('This import was already undone.', 409);

  const ids = idList(batch.student_ids);
  const students = ids.length
    ? await db.student.findMany({ where: { id: { in: ids }, school_id: sid }, select: { id: true } })
    : [];
  const studentIds = students.map((s) => s.id);

  if (studentIds.length) {
    const later = await db.payment.count({
      where: { school_id: sid, student_id: { in: studentIds }, NOT: { payment_number: { startsWith: 'OPEN-' } } },
    });
    if (later > 0) {
      throw new ImportError(
        `Fees have been collected from ${later === 1 ? 'a student' : 'students'} in this import since it was made, so it cannot be undone. Correct those students one by one instead.`,
        409
      );
    }
    const [allInvoices, importedInvoices] = await Promise.all([
      db.invoice.count({ where: { school_id: sid, student_id: { in: studentIds } } }),
      db.invoice.count({ where: { school_id: sid, student_id: { in: studentIds }, notes: { contains: "school's records before the ERP" } } }),
    ]);
    if (allInvoices > importedInvoices) {
      throw new ImportError('New invoices were created for students in this import, so it cannot be undone.', 409);
    }
  }

  return db.$transaction(async (tx) => {
    let removed = 0;
    if (studentIds.length) {
      // Cascades to admission, parent_detail, invoice, payment, fee assignments, documents
      const res = await tx.student.deleteMany({ where: { id: { in: studentIds }, school_id: sid } });
      removed = res.count;
    }
    await tx.student_import_batch.update({
      where: { id: batch.id },
      data: { status: 'undone', undone_at: new Date(), undone_by: actor ? String(actor).slice(0, 150) : null },
    });
    return { batch_id: String(batch.id), students_removed: removed };
  });
};

/* ---------- follow-up after an import ---------- */

const MANDATORY = DOCUMENT_COLUMNS.map((c) => c.document);
const SAME_DOCUMENT = { aadhar_card: 'aadhaar_card' };

/**
 * Imported students that still need something: a class (or section), or
 * documents. Students admitted through the normal flow are not listed.
 */
export const followUpList = async (db, schoolId) => {
  const sid = BigInt(schoolId);
  const batches = await db.student_import_batch.findMany({
    where: { school_id: sid, status: 'imported' },
    select: { student_ids: true },
  });
  const ids = [...new Set(batches.flatMap((b) => idList(b.student_ids).map(String)))].map((v) => BigInt(v));
  if (!ids.length) return { class_pending: [], documents_pending: [] };

  const admissions = await db.admission.findMany({
    where: { school_id: sid, student_id: { in: ids } },
    select: {
      id: true,
      student_id: true,
      class_id: true,
      section_id: true,
      school_class: { select: { class_name: true } },
      section: { select: { section_name: true } },
      student: { select: { first_name: true, last_name: true, admission_number: true } },
      documents: { select: { document_type: true, file_name: true, file_path: true, document_number: true } },
    },
  });

  const shaped = admissions.map((a) => {
    const have = new Set(
      (a.documents || [])
        .filter((d) => String(d.file_path || '').trim() || String(d.file_name || '').trim() || String(d.document_number || '').trim())
        .map((d) => SAME_DOCUMENT[d.document_type] || d.document_type)
    );
    const pending = MANDATORY.filter((t) => !have.has(t));
    return {
      admission_id: String(a.id),
      student_id: String(a.student_id),
      admission_number: a.student?.admission_number || null,
      name: [a.student?.first_name, a.student?.last_name].filter(Boolean).join(' '),
      class_id: a.class_id ? String(a.class_id) : null,
      class_name: a.school_class?.class_name || null,
      section_id: a.section_id ? String(a.section_id) : null,
      section_name: a.section?.section_name || null,
      documents_pending: pending.map((t) => ({ type: t, label: DOCUMENT_LABELS[t] || t })),
    };
  });
  const byName = (x, y) => String(x.admission_number).localeCompare(String(y.admission_number), 'en', { numeric: true });
  return {
    class_pending: shaped.filter((a) => !a.class_id || !a.section_id).sort(byName),
    documents_pending: shaped.filter((a) => a.documents_pending.length).sort(byName),
  };
};

/** Gives an admission its class and section (both must belong to the school). */
export const assignClass = async (db, { schoolId, admissionId, classId, sectionId }) => {
  const sid = BigInt(schoolId);
  if (!/^\d+$/.test(String(admissionId ?? ''))) throw new ImportError('Invalid admission id.', 400);
  if (!/^\d+$/.test(String(classId ?? ''))) throw new ImportError('Choose a class.', 400);
  if (!/^\d+$/.test(String(sectionId ?? ''))) throw new ImportError('Choose a section.', 400);
  const admission = await db.admission.findFirst({ where: { id: BigInt(admissionId), school_id: sid }, select: { id: true } });
  if (!admission) throw new ImportError('Admission not found.', 404);
  const cls = await db.school_class.findFirst({ where: { id: BigInt(classId), school_id: sid }, select: { id: true, class_name: true } });
  if (!cls) throw new ImportError('Class not found in this school.', 404);
  const section = await db.section.findFirst({
    where: { id: BigInt(sectionId), school_id: sid, class_id: cls.id },
    select: { id: true, section_name: true },
  });
  if (!section) throw new ImportError(`That section is not in ${cls.class_name}.`, 400);
  await db.admission.update({
    where: { id: admission.id },
    data: { class_id: cls.id, section_id: section.id, updated_at: new Date() },
  });
  return { admission_id: String(admission.id), class_name: cls.class_name, section_name: section.section_name };
};

/**
 * Records that the school has a document for an admission: a physical copy,
 * or an uploaded scan ({ file_name, file_path, file_size, mime_type }).
 */
export const recordDocument = async (db, { schoolId, admissionId, documentType, file, actor }) => {
  const sid = BigInt(schoolId);
  if (!MANDATORY.includes(documentType)) throw new ImportError('Unknown document type.', 400);
  if (!/^\d+$/.test(String(admissionId ?? ''))) throw new ImportError('Invalid admission id.', 400);
  const admission = await db.admission.findFirst({ where: { id: BigInt(admissionId), school_id: sid }, select: { id: true } });
  if (!admission) throw new ImportError('Admission not found.', 404);
  const data = file
    ? { file_name: String(file.file_name).slice(0, 255), file_path: String(file.file_path).slice(0, 500), file_size: file.file_size ?? null, mime_type: file.mime_type ?? null }
    : { file_name: 'Physical copy', file_path: '' };
  const existing = await db.documents.findFirst({ where: { admission_id: admission.id, document_type: documentType }, select: { id: true } });
  const by = actor ? String(actor).slice(0, 100) : null;
  if (existing) {
    await db.documents.update({ where: { id: existing.id }, data: { ...data, uploaded_by: by, updated_at: new Date() } });
  } else {
    await db.documents.create({ data: { admission_id: admission.id, document_type: documentType, ...data, uploaded_by: by } });
  }
  return { admission_id: String(admission.id), document_type: documentType, label: DOCUMENT_LABELS[documentType] };
};

/* ---------- template ---------- */

/** Sheets of the template (arrays of rows), filled with this school's classes. */
export const templateSheets = (lookups) => {
  const students = [COLUMNS.map((c) => c.header), COLUMNS.map((c) => c.example)];
  const classes = [['Class', 'Sections', 'Fee structure (current year)']];
  for (const c of lookups.classes) {
    const secs = lookups.sections.filter((s) => String(s.class_id) === String(c.id)).map((s) => s.section_name).join(', ');
    const fee = lookups.currentYear
      ? lookups.structures
          .filter((s) => String(s.class_id) === String(c.id) && String(s.academic_year_id) === String(lookups.currentYear.id))
          .reduce((sum, s) => sum + Math.round(Number(s.amount || 0) * 100), 0)
      : 0;
    classes.push([c.class_name, secs || '(no sections yet)', fee ? `Rs ${rupees(fee)}` : '-']);
  }
  const help = [
    ['How to fill this sheet'],
    ['One row per student. Delete the example row (row 2) before uploading.'],
    ['Required: Admission No, Student First Name, and the father or the mother (name and 10-digit phone).'],
    ['Class and Section must be written exactly as on the "Classes" sheet. Leave both empty if the class is not decided yet ("class pending").'],
    [`Academic Year: leave empty for the current year${lookups.currentYear ? ` (${lookups.currentYear.year_name})` : ''}.`],
    ['Total Fee: the fee for this year. Leave empty to use the class fee structure.'],
    ['Amount Already Paid: everything the parent paid for this year before the ERP. Needs the Last Payment Date.'],
    ['Dates as DD-MM-YYYY, e.g. 05-07-2026.'],
    ['Documents: Yes if the school has the document (a scan can be uploaded later), No if it is still pending.'],
    ['Nothing is saved until you check the preview and press Import. A wrong import can be undone until new fees are collected.'],
  ];
  return { Students: students, Classes: classes, Instructions: help };
};
