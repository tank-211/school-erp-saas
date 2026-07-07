import pool from '../config/db.js';
import { sendEmail } from '../utils/emailSender.js';

const VALID_RECIPIENT_TYPES = ['lead', 'student', 'parent'];
const VALID_TARGET_AUDIENCES = ['lead_student', 'father', 'mother'];

const getRecipientQuery = {
  lead: {
    text: 'SELECT id, first_name, last_name, email FROM lead WHERE id = $1 AND school_id = $2',
  },
  student: {
    text: 'SELECT id, first_name, last_name, email FROM student WHERE id = $1 AND school_id = $2',
  },
  parent: {
    text: 'SELECT id, first_name, last_name, email FROM parent_detail WHERE id = $1 AND school_id = $2',
  },
};

const buildDisplayName = (firstName, lastName) =>
  [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown Recipient';

export const resolveApplicationRecipient = async (schoolId, body) => {
  const applicationId = Number.parseInt(body?.application_id, 10);
  const targetAudience = String(body?.target_audience || '').trim().toLowerCase();

  if (!applicationId) {
    throw new Error('application_id is required');
  }

  if (!VALID_TARGET_AUDIENCES.includes(targetAudience)) {
    throw new Error('target_audience must be one of: lead_student, father, mother');
  }

  const applicationResult = await pool.queryAsync(
    `SELECT
       a.id AS application_id,
       a.school_id,
       a.lead_id,
       a.application_number,
       l.first_name AS lead_first_name,
       l.last_name AS lead_last_name,
       l.email AS lead_email,
       asi.first_name AS student_first_name,
       asi.last_name AS student_last_name,
       asi.email AS student_email,
       api.father_name,
       api.father_email,
       api.mother_name,
       api.mother_email
     FROM application a
     LEFT JOIN lead l ON l.id = a.lead_id AND l.school_id = a.school_id
     LEFT JOIN application_student_info asi ON asi.application_id = a.id
     LEFT JOIN application_parent_info api ON api.application_id = a.id
     WHERE a.id = $1 AND a.school_id = $2
     LIMIT 1`,
    [applicationId, schoolId],
  );

  if (!applicationResult.rows.length) {
    throw new Error('Application not found for this school');
  }

  const application = applicationResult.rows[0];

  if (targetAudience === 'lead_student') {
    if (application.lead_id) {
      if (!application.lead_email) {
        throw new Error(`Lead email is missing for application ${applicationId}`);
      }

      return {
        application_id: applicationId,
        recipient_type: 'lead',
        recipient_id: Number(application.lead_id),
        recipient_email: application.lead_email,
        recipient_name: buildDisplayName(application.lead_first_name, application.lead_last_name),
        target_audience: 'lead_student',
        source: 'lead',
        context_label: application.application_number || `Application #${applicationId}`,
      };
    }

    if (!application.student_email) {
      throw new Error(`Student email is missing for application ${applicationId}`);
    }

    return {
      application_id: applicationId,
      recipient_type: 'student',
      recipient_id: Number(application.application_id),
      recipient_email: application.student_email,
      recipient_name: buildDisplayName(application.student_first_name, application.student_last_name),
      target_audience: 'lead_student',
      source: 'application_student_info',
      context_label: application.application_number || `Application #${applicationId}`,
    };
  }

  const relation = targetAudience === 'father' ? 'Father' : 'Mother';

  const parentResult = await pool.queryAsync(
    `SELECT
       pd.id,
       pd.first_name,
       pd.last_name,
       pd.email
     FROM parent_detail pd
     INNER JOIN admission ad ON ad.student_id = pd.student_id AND ad.application_id = $1 AND ad.school_id = $2
     WHERE pd.school_id = $2
       AND LOWER(pd.relation) = LOWER($3)
     ORDER BY pd.updated_at DESC, pd.id DESC
     LIMIT 1`,
    [applicationId, schoolId, relation],
  );

  if (parentResult.rows.length) {
    const parent = parentResult.rows[0];

    if (!parent.email) {
      throw new Error(`${relation} email is missing for application ${applicationId}`);
    }

    return {
      application_id: applicationId,
      recipient_type: 'parent',
      recipient_id: Number(parent.id),
      recipient_email: parent.email,
      recipient_name: buildDisplayName(parent.first_name, parent.last_name),
      target_audience,
      source: 'parent_detail',
      context_label: application.application_number || `Application #${applicationId}`,
    };
  }

  const fallbackEmail = targetAudience === 'father' ? application.father_email : application.mother_email;
  const fallbackName = targetAudience === 'father' ? application.father_name : application.mother_name;

  if (!fallbackEmail) {
    throw new Error(`${relation} email is missing for application ${applicationId}`);
  }

  return {
    application_id: applicationId,
    recipient_type: 'parent',
    recipient_id: Number(applicationId),
    recipient_email: fallbackEmail,
    recipient_name: fallbackName || relation,
    target_audience,
    source: 'application_parent_info',
    context_label: application.application_number || `Application #${applicationId}`,
  };
};

export const sendEmailMessage = async (schoolId, userId, body) => {
  const { recipient_type, recipient_id, recipient_email, subject, message, template_id } = body;

  if (!recipient_type || !VALID_RECIPIENT_TYPES.includes(recipient_type)) {
    throw new Error('recipient_type must be one of: lead, student, parent');
  }

  if (!recipient_id) {
    throw new Error('recipient_id is required');
  }

  let finalSubject = subject;
  let finalMessage = message;

  if (template_id) {
    const templateResult = await pool.queryAsync(
      'SELECT id, subject, content FROM message_template WHERE id = $1 AND school_id = $2',
      [template_id, schoolId]
    );

    if (!templateResult.rows.length) {
      throw new Error('Template not found');
    }

    const template = templateResult.rows[0];
    finalSubject = template.subject;
    finalMessage = template.content;

    await pool.queryAsync(
      'UPDATE message_template SET last_used_at = NOW() WHERE id = $1 AND school_id = $2',
      [template_id, schoolId]
    );
  }

  if (!finalSubject || !finalMessage) {
    throw new Error('subject and message are required when template_id is not provided');
  }

  let recipient = null;

  if (recipient_email) {
    recipient = {
      email: recipient_email,
      first_name: body.recipient_first_name || '',
      last_name: body.recipient_last_name || '',
    };
  } else {
    const recipientQuery = getRecipientQuery[recipient_type];
    const recipientResult = await pool.queryAsync(recipientQuery.text, [recipient_id, schoolId]);

    if (!recipientResult.rows.length) {
      throw new Error(`${recipient_type} recipient not found`);
    }

    recipient = recipientResult.rows[0];

    if (!recipient.email) {
      throw new Error(`Recipient email is missing for ${recipient_type} ${recipient_id}`);
    }
  }

  sendEmail(recipient.email, finalSubject, finalMessage);

  const insertResult = await pool.queryAsync(
    `INSERT INTO communication_log (
      school_id,
      recipient_type,
      recipient_id,
      channel,
      subject,
      message,
      status,
      sent_at,
      created_by
    ) VALUES ($1,$2,$3,'email',$4,$5,'sent',NOW(),$6)
    RETURNING id, school_id, recipient_type, recipient_id, channel, subject, message, status, sent_at, created_by`,
    [schoolId, recipient_type, recipient_id, finalSubject, finalMessage, userId]
  );

  return insertResult.rows[0];
};

export const getEmailLogs = async (schoolId, query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 20));
  const offset = (page - 1) * limit;
  const status = query.status ? query.status.trim() : null;
  const fromDate = query.from ? query.from.trim() : null;
  const toDate = query.to ? query.to.trim() : null;

  const filters = ['cl.school_id = $1', "cl.channel = 'email'"];
  const values = [schoolId];
  let index = values.length + 1;

  if (status) {
    filters.push(`cl.status = $${index}`);
    values.push(status);
    index += 1;
  }

  if (fromDate) {
    filters.push(`cl.sent_at >= $${index}`);
    values.push(fromDate);
    index += 1;
  }

  if (toDate) {
    filters.push(`cl.sent_at <= $${index}`);
    values.push(toDate);
    index += 1;
  }

  const whereClause = filters.length ? `WHERE ${filters.join(' AND ')}` : '';

  const countQuery = `SELECT COUNT(*) AS total FROM communication_log cl ${whereClause}`;
  const countResult = await pool.queryAsync(countQuery, values);
  const total = parseInt(countResult.rows[0].total, 10);

  const logQuery = `
    SELECT
      cl.id,
      cl.recipient_type,
      cl.recipient_id,
      cl.subject,
      cl.status,
      cl.sent_at,
      cl.opened_at,
      cl.clicked_at,
      COALESCE(
        CONCAT(l.first_name, ' ', l.last_name),
        CONCAT(s.first_name, ' ', s.last_name),
        CONCAT(p.first_name, ' ', p.last_name),
        'Unknown Recipient'
      ) AS recipient_name,
      COALESCE(l.email, s.email, p.email) AS recipient_email
    FROM communication_log cl
    LEFT JOIN lead l ON cl.recipient_type = 'lead' AND cl.recipient_id = l.id
    LEFT JOIN student s ON cl.recipient_type = 'student' AND cl.recipient_id = s.id
    LEFT JOIN parent_detail p ON cl.recipient_type = 'parent' AND cl.recipient_id = p.id
    ${whereClause}
    ORDER BY cl.sent_at DESC
    LIMIT $${index} OFFSET $${index + 1}
  `;

  values.push(limit, offset);

  const logsResult = await pool.queryAsync(logQuery, values);

  return {
    logs: logsResult.rows,
    pagination: {
      total,
      page,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    },
  };
};

export const getEmailStats = async (schoolId) => {
  const statsResult = await pool.queryAsync(
    `SELECT
      COUNT(*) FILTER (WHERE channel = 'email') AS total_emails,
      COUNT(*) FILTER (WHERE channel = 'email' AND opened_at IS NOT NULL) AS opened,
      COUNT(*) FILTER (WHERE channel = 'email' AND clicked_at IS NOT NULL) AS clicked
    FROM communication_log
    WHERE school_id = $1`,
    [schoolId]
  );

  const stats = statsResult.rows[0] || { total_emails: 0, opened: 0, clicked: 0 };

  const total = parseInt(stats.total_emails, 10) || 0;
  const opened = parseInt(stats.opened, 10) || 0;
  const clicked = parseInt(stats.clicked, 10) || 0;

  return {
    total_emails: total,
    opened,
    clicked,
    open_rate: total ? Number(((opened / total) * 100).toFixed(2)) : 0,
    click_rate: total ? Number(((clicked / total) * 100).toFixed(2)) : 0,
  };
};

export const updateEmailStatus = async (schoolId, id, body) => {
  const emailLogId = parseInt(id, 10);
  if (!emailLogId) {
    throw new Error('Valid email log ID is required');
  }

  const fields = [];
  const values = [schoolId, emailLogId];

  if (body.opened === true) {
    fields.push('opened_at = COALESCE(opened_at, NOW())');
  }

  if (body.clicked === true) {
    fields.push('clicked_at = COALESCE(clicked_at, NOW())');
  }

  if (typeof body.status === 'string' && body.status.trim()) {
    fields.push(`status = $${values.length + 1}`);
    values.push(body.status.trim());
  }

  if (!fields.length) {
    throw new Error('At least one status field is required: opened or clicked or status');
  }

  const updateQuery = `
    UPDATE communication_log
    SET ${fields.join(', ')}, updated_at = NOW()
    WHERE school_id = $1 AND id = $2
    RETURNING id, recipient_type, recipient_id, subject, status, opened_at, clicked_at, sent_at
  `;

  const updateResult = await pool.queryAsync(updateQuery, values);

  if (!updateResult.rows.length) {
    throw new Error('Email log entry not found');
  }

  return updateResult.rows[0];
};

export const createTemplate = async (schoolId, body) => {
  const { name, category, subject, content } = body;

  if (!name || !category || !subject || !content) {
    throw new Error('name, category, subject, and content are required');
  }

  const insertResult = await pool.queryAsync(
    `INSERT INTO message_template (school_id, name, category, subject, content, last_used_at)
     VALUES ($1, $2, $3, $4, $5, NULL)
     RETURNING id, name, category, subject, content, last_used_at`,
    [schoolId, name.trim(), category.trim(), subject.trim(), content.trim()]
  );

  return insertResult.rows[0];
};

export const getTemplates = async (schoolId) => {
  const result = await pool.queryAsync(
    `SELECT id, name, category, subject, content, last_used_at
     FROM message_template
     WHERE school_id = $1
     ORDER BY name ASC`,
    [schoolId]
  );

  return result.rows;
};

export const updateTemplate = async (schoolId, id, body) => {
  const templateId = parseInt(id, 10);
  if (!templateId) {
    throw new Error('Valid template ID is required');
  }

  const updates = [];
  const values = [schoolId, templateId];
  let index = values.length + 1;

  if (body.name) {
    updates.push(`name = $${index}`);
    values.push(body.name.trim());
    index += 1;
  }
  if (body.category) {
    updates.push(`category = $${index}`);
    values.push(body.category.trim());
    index += 1;
  }
  if (body.subject) {
    updates.push(`subject = $${index}`);
    values.push(body.subject.trim());
    index += 1;
  }
  if (body.content) {
    updates.push(`content = $${index}`);
    values.push(body.content.trim());
    index += 1;
  }

  if (!updates.length) {
    throw new Error('At least one field is required to update');
  }

  const updateQuery = `
    UPDATE message_template
    SET ${updates.join(', ')}, last_used_at = COALESCE(last_used_at, NOW())
    WHERE school_id = $1 AND id = $2
    RETURNING id, name, category, subject, content, last_used_at
  `;

  const updateResult = await pool.queryAsync(updateQuery, values);

  if (!updateResult.rows.length) {
    throw new Error('Template not found');
  }

  return updateResult.rows[0];
};

export const deleteTemplate = async (schoolId, id) => {
  const templateId = parseInt(id, 10);
  if (!templateId) {
    throw new Error('Valid template ID is required');
  }

  const deleteResult = await pool.queryAsync(
    'DELETE FROM message_template WHERE school_id = $1 AND id = $2 RETURNING id',
    [schoolId, templateId]
  );

  if (!deleteResult.rows.length) {
    throw new Error('Template not found');
  }

  return { id: deleteResult.rows[0].id };
};

export const getRecipients = async (schoolId, type, search) => {
  if (!type || !VALID_RECIPIENT_TYPES.includes(type)) {
    throw new Error('type query parameter must be lead, student, or parent');
  }

  const searchTerm = search ? `%${search.trim()}%` : '%';
  let queryText;

  switch (type) {
    case 'lead':
      queryText = `
        SELECT id, CONCAT(first_name, ' ', COALESCE(last_name, '')) AS name, email
        FROM lead
        WHERE school_id = $1
          AND (first_name ILIKE $2 OR last_name ILIKE $2 OR email ILIKE $2)
        ORDER BY first_name ASC
        LIMIT 100
      `;
      break;
    case 'student':
      queryText = `
        SELECT id, CONCAT(first_name, ' ', COALESCE(last_name, '')) AS name, email
        FROM student
        WHERE school_id = $1
          AND (first_name ILIKE $2 OR last_name ILIKE $2 OR email ILIKE $2)
        ORDER BY first_name ASC
        LIMIT 100
      `;
      break;
    case 'parent':
      queryText = `
        SELECT id, CONCAT(first_name, ' ', COALESCE(last_name, '')) AS name, email
        FROM parent_detail
        WHERE school_id = $1
          AND (first_name ILIKE $2 OR last_name ILIKE $2 OR email ILIKE $2)
        ORDER BY first_name ASC
        LIMIT 100
      `;
      break;
    default:
      queryText = '';
  }

  const result = await pool.queryAsync(queryText, [schoolId, searchTerm]);
  return result.rows;
};
