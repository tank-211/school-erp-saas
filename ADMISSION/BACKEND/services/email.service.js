import prisma from '../src/lib/prisma.js';
import { sendEmail } from '../utils/emailSender.js';

const VALID_RECIPIENT_TYPES = ['lead', 'student', 'parent'];
const VALID_TARGET_AUDIENCES = ['lead_student', 'father', 'mother'];


const buildDisplayName = (firstName, lastName) =>
  [firstName, lastName].filter(Boolean).join(' ').trim() || 'Unknown Recipient';

export const resolveApplicationRecipient = async (schoolId, body) => {
  const applicationId = BigInt(body?.application_id);
  const targetAudience = String(
    body?.target_audience || ''
  ).trim().toLowerCase();

  if (!applicationId) {
    throw new Error('application_id is required');
  }

  if (!VALID_TARGET_AUDIENCES.includes(targetAudience)) {
    throw new Error(
      'target_audience must be one of: lead_student, father, mother'
    );
  }

  const application = await prisma.application.findFirst({
    where: {
      id: applicationId,
      school_id: BigInt(schoolId),
    },
    include: {
      lead: {
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      },
      application_student_info: true,
      application_parent_info: true,
    },
  });

  if (!application) {
    throw new Error('Application not found for this school');
  }

  const studentInfo = application.application_student_info;
  const parentInfo = application.application_parent_info;

  if (targetAudience === 'lead_student') {
    if (application.lead_id && application.lead) {
      if (!application.lead.email) {
        throw new Error(
          `Lead email is missing for application ${applicationId}`
        );
      }

      return {
        application_id: Number(applicationId),
        recipient_type: 'lead',
        recipient_id: Number(application.lead.id),
        recipient_email: application.lead.email,
        recipient_name: buildDisplayName(
          application.lead.first_name,
          application.lead.last_name
        ),
        target_audience: 'lead_student',
        source: 'lead',
        context_label:
          application.application_number ||
          `Application #${applicationId}`,
      };
    }

    if (!studentInfo?.email) {
      throw new Error(
        `Student email is missing for application ${applicationId}`
      );
    }

    return {
      application_id: Number(applicationId),
      recipient_type: 'student',
      recipient_id: Number(applicationId),
      recipient_email: studentInfo.email,
      recipient_name: buildDisplayName(
        studentInfo.first_name,
        studentInfo.last_name
      ),
      target_audience: 'lead_student',
      source: 'application_student_info',
      context_label:
        application.application_number ||
        `Application #${applicationId}`,
    };
  }

  const relation =
    targetAudience === 'father' ? 'Father' : 'Mother';

  const parent = await prisma.parent_detail.findFirst({
    where: {
      school_id: BigInt(schoolId),
      relation: {
        equals: relation,
        mode: 'insensitive',
      },
      student_id: application.student_id,
    },
    orderBy: [
      {
        updated_at: 'desc',
      },
      {
        id: 'desc',
      },
    ],
  });

  if (parent) {
    if (!parent.email) {
      throw new Error(
        `${relation} email is missing for application ${applicationId}`
      );
    }

    return {
      application_id: Number(applicationId),
      recipient_type: 'parent',
      recipient_id: Number(parent.id),
      recipient_email: parent.email,
      recipient_name: buildDisplayName(
        parent.first_name,
        parent.last_name
      ),
      target_audience: targetAudience,
      source: 'parent_detail',
      context_label:
        application.application_number ||
        `Application #${applicationId}`,
    };
  }

  const fallbackEmail =
    targetAudience === 'father'
      ? parentInfo?.father_email
      : parentInfo?.mother_email;

  const fallbackName =
    targetAudience === 'father'
      ? parentInfo?.father_name
      : parentInfo?.mother_name;

  if (!fallbackEmail) {
    throw new Error(
      `${relation} email is missing for application ${applicationId}`
    );
  }

  return {
    application_id: Number(applicationId),
    recipient_type: 'parent',
    recipient_id: Number(applicationId),
    recipient_email: fallbackEmail,
    recipient_name: fallbackName || relation,
    target_audience: targetAudience,
    source: 'application_parent_info',
    context_label:
      application.application_number ||
      `Application #${applicationId}`,
  };
};

export const sendEmailMessage = async (schoolId, userId, body) => {
  const {
    recipient_type,
    recipient_id,
    recipient_email,
    subject,
    message,
    template_id,
  } = body;

  if (
    !recipient_type ||
    !VALID_RECIPIENT_TYPES.includes(recipient_type)
  ) {
    throw new Error(
      'recipient_type must be one of: lead, student, parent'
    );
  }

  if (!recipient_id) {
    throw new Error('recipient_id is required');
  }

  let finalSubject = subject;
  let finalMessage = message;

  if (template_id) {
    const template = await prisma.message_template.findFirst({
      where: {
        id: BigInt(template_id),
        school_id: BigInt(schoolId),
      },
      select: {
        id: true,
        subject: true,
        content: true,
      },
    });

    if (!template) {
      throw new Error('Template not found');
    }

    finalSubject = template.subject;
    finalMessage = template.content;

    await prisma.message_template.update({
      where: {
        id: template.id,
      },
      data: {
        last_used_at: new Date(),
      },
    });
  }

  if (!finalSubject || !finalMessage) {
    throw new Error(
      'subject and message are required when template_id is not provided'
    );
  }

  let recipient = null;

  if (recipient_email) {
    recipient = {
      email: recipient_email,
      first_name: body.recipient_first_name || '',
      last_name: body.recipient_last_name || '',
    };
  } else {
    const recipientId = BigInt(recipient_id);

    if (recipient_type === 'lead') {
      recipient = await prisma.lead.findFirst({
        where: {
          id: recipientId,
          school_id: BigInt(schoolId),
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      });
    } else if (recipient_type === 'student') {
      recipient = await prisma.student.findFirst({
        where: {
          id: recipientId,
          school_id: BigInt(schoolId),
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      });
    } else {
      recipient = await prisma.parent_detail.findFirst({
        where: {
          id: recipientId,
          school_id: BigInt(schoolId),
        },
        select: {
          id: true,
          first_name: true,
          last_name: true,
          email: true,
        },
      });
    }

    if (!recipient) {
      throw new Error(
        `${recipient_type} recipient not found`
      );
    }

    if (!recipient.email) {
      throw new Error(
        `Recipient email is missing for ${recipient_type} ${recipient_id}`
      );
    }
  }

  await sendEmail(
    recipient.email,
    finalSubject,
    finalMessage
  );

  return prisma.communication_log.create({
    data: {
      school_id: BigInt(schoolId),
      recipient_type,
      recipient_id: BigInt(recipient_id),
      channel: 'email',
      subject: finalSubject,
      message: finalMessage,
      status: 'sent',
      sent_at: new Date(),
      created_by: String(userId),
    },
  });
};

export const getEmailLogs = async (schoolId, query) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(
    100,
    Math.max(1, parseInt(query.limit, 10) || 20)
  );
  const offset = (page - 1) * limit;

  const status = query.status?.trim() || undefined;

  const where = {
    school_id: BigInt(schoolId),
    channel: 'email',
    ...(status ? { status } : {}),
    ...(query.from || query.to
      ? {
          sent_at: {
            ...(query.from
              ? { gte: new Date(query.from) }
              : {}),
            ...(query.to
              ? { lte: new Date(query.to) }
              : {}),
          },
        }
      : {}),
  };

  const [total, logs] = await Promise.all([
    prisma.communication_log.count({
      where,
    }),

    prisma.communication_log.findMany({
      where,
      orderBy: {
        sent_at: 'desc',
      },
      skip: offset,
      take: limit,
      select: {
        id: true,
        recipient_type: true,
        recipient_id: true,
        subject: true,
        status: true,
        sent_at: true,
        opened_at: true,
        clicked_at: true,
      },
    }),
  ]);

  const enrichedLogs = await Promise.all(
    logs.map(async (log) => {
      let recipient = null;

      if (log.recipient_type === 'lead') {
        recipient = await prisma.lead.findUnique({
          where: { id: log.recipient_id },
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        });
      } else if (log.recipient_type === 'student') {
        recipient = await prisma.student.findUnique({
          where: { id: log.recipient_id },
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        });
      } else if (log.recipient_type === 'parent') {
        recipient = await prisma.parent_detail.findUnique({
          where: { id: log.recipient_id },
          select: {
            first_name: true,
            last_name: true,
            email: true,
          },
        });
      }

      return {
        ...log,
        recipient_name: recipient
          ? buildDisplayName(
              recipient.first_name,
              recipient.last_name
            )
          : 'Unknown Recipient',
        recipient_email: recipient?.email || null,
      };
    })
  );

  return {
    logs: enrichedLogs,
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
  const where = {
    school_id: BigInt(schoolId),
    channel: 'email',
  };

  const [total, opened, clicked] = await Promise.all([
    prisma.communication_log.count({
      where,
    }),

    prisma.communication_log.count({
      where: {
        ...where,
        opened_at: {
          not: null,
        },
      },
    }),

    prisma.communication_log.count({
      where: {
        ...where,
        clicked_at: {
          not: null,
        },
      },
    }),
  ]);

  return {
    total_emails: total,
    opened,
    clicked,
    open_rate: total
      ? Number(((opened / total) * 100).toFixed(2))
      : 0,
    click_rate: total
      ? Number(((clicked / total) * 100).toFixed(2))
      : 0,
  };
};

export const updateEmailStatus = async (schoolId, id, body) => {
  const emailLogId = BigInt(id);

  if (emailLogId <= 0n) {
    throw new Error('Valid email log ID is required');
  }

  const existing = await prisma.communication_log.findFirst({
    where: {
      id: emailLogId,
      school_id: BigInt(schoolId),
      channel: 'email',
    },
  });

  if (!existing) {
    throw new Error('Email log entry not found');
  }

  const data = {
    updated_at: new Date(),
  };

  if (body.opened === true) {
    data.opened_at = existing.opened_at || new Date();
  }

  if (body.clicked === true) {
    data.clicked_at = existing.clicked_at || new Date();
  }

  if (
    typeof body.status === 'string' &&
    body.status.trim()
  ) {
    data.status = body.status.trim();
  }

  if (Object.keys(data).length === 1) {
    throw new Error(
      'At least one status field is required: opened or clicked or status'
    );
  }

  return prisma.communication_log.update({
    where: {
      id: emailLogId,
    },
    data,
    select: {
      id: true,
      recipient_type: true,
      recipient_id: true,
      subject: true,
      status: true,
      opened_at: true,
      clicked_at: true,
      sent_at: true,
    },
  });
};

export const createTemplate = async (schoolId, body) => {
  const { name, category, subject, content } = body;

  if (!name || !category || !subject || !content) {
    throw new Error(
      'name, category, subject, and content are required'
    );
  }

  return prisma.message_template.create({
    data: {
      school_id: BigInt(schoolId),
      name: name.trim(),
      category: category.trim(),
      subject: subject.trim(),
      content: content.trim(),
      last_used_at: null,
    },
    select: {
      id: true,
      name: true,
      category: true,
      subject: true,
      content: true,
      last_used_at: true,
    },
  });
};

export const getTemplates = async (schoolId) => {
  return prisma.message_template.findMany({
    where: {
      school_id: BigInt(schoolId),
    },
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      name: true,
      category: true,
      subject: true,
      content: true,
      last_used_at: true,
    },
  });
};

export const updateTemplate = async (schoolId, id, body) => {
  const templateId = BigInt(id);

  if (templateId <= 0n) {
    throw new Error('Valid template ID is required');
  }

  const data = {};

  if (body.name) {
    data.name = body.name.trim();
  }

  if (body.category) {
    data.category = body.category.trim();
  }

  if (body.subject) {
    data.subject = body.subject.trim();
  }

  if (body.content) {
    data.content = body.content.trim();
  }

  if (!Object.keys(data).length) {
    throw new Error('At least one field is required to update');
  }

  data.last_used_at = new Date();

  const existing = await prisma.message_template.findFirst({
    where: {
      id: templateId,
      school_id: BigInt(schoolId),
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new Error('Template not found');
  }

  return prisma.message_template.update({
    where: {
      id: templateId,
    },
    data,
    select: {
      id: true,
      name: true,
      category: true,
      subject: true,
      content: true,
      last_used_at: true,
    },
  });
};

export const deleteTemplate = async (schoolId, id) => {
  const templateId = BigInt(id);

  if (templateId <= 0n) {
    throw new Error('Valid template ID is required');
  }

  const existing = await prisma.message_template.findFirst({
    where: {
      id: templateId,
      school_id: BigInt(schoolId),
    },
    select: {
      id: true,
    },
  });

  if (!existing) {
    throw new Error('Template not found');
  }

  await prisma.message_template.delete({
    where: {
      id: templateId,
    },
  });

  return {
    id: templateId,
  };
};

export const getRecipients = async (schoolId, type, search) => {
  if (!type || !VALID_RECIPIENT_TYPES.includes(type)) {
    throw new Error(
      'type query parameter must be lead, student, or parent'
    );
  }

  const searchTerm = search?.trim() || '';

  const where = {
    school_id: BigInt(schoolId),
    ...(searchTerm
      ? {
          OR: [
            {
              first_name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              last_name: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
            {
              email: {
                contains: searchTerm,
                mode: 'insensitive',
              },
            },
          ],
        }
      : {}),
  };

  if (type === 'lead') {
    const recipients = await prisma.lead.findMany({
      where,
      orderBy: {
        first_name: 'asc',
      },
      take: 100,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
      },
    });

    return recipients.map((recipient) => ({
      id: recipient.id,
      name: buildDisplayName(
        recipient.first_name,
        recipient.last_name
      ),
      email: recipient.email,
    }));
  }

  if (type === 'student') {
    const recipients = await prisma.student.findMany({
      where,
      orderBy: {
        first_name: 'asc',
      },
      take: 100,
      select: {
        id: true,
        first_name: true,
        last_name: true,
        email: true,
      },
    });

    return recipients.map((recipient) => ({
      id: recipient.id,
      name: buildDisplayName(
        recipient.first_name,
        recipient.last_name
      ),
      email: recipient.email,
    }));
  }

  const recipients = await prisma.parent_detail.findMany({
    where,
    orderBy: {
      first_name: 'asc',
    },
    take: 100,
    select: {
      id: true,
      first_name: true,
      last_name: true,
      email: true,
    },
  });

  return recipients.map((recipient) => ({
    id: recipient.id,
    name: buildDisplayName(
      recipient.first_name,
      recipient.last_name
    ),
    email: recipient.email,
  }));
};
