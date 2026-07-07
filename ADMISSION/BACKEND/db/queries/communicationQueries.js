import prisma from '../../src/lib/prisma.js';

const recipientQueryMap = {
  lead: `
    SELECT
      id,
      school_id,
      'lead' AS recipient_type,
      TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS name,
      first_name,
      last_name,
      email,
      phone,
      desired_class AS context_label
    FROM lead
    WHERE id = $1 AND school_id = $2
  `,
  student: `
    SELECT
      id,
      school_id,
      'student' AS recipient_type,
      TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))) AS name,
      first_name,
      last_name,
      email,
      phone,
      admission_number AS context_label
    FROM student
    WHERE id = $1 AND school_id = $2
  `,
  parent: `
    SELECT
      pd.id,
      pd.school_id,
      'parent' AS recipient_type,
      TRIM(CONCAT(COALESCE(pd.first_name, ''), ' ', COALESCE(pd.last_name, ''))) AS name,
      pd.first_name,
      pd.last_name,
      pd.email,
      pd.phone,
      CONCAT(pd.relation, CASE WHEN s.admission_number IS NOT NULL THEN CONCAT(' - ', s.admission_number) ELSE '' END) AS context_label
    FROM parent_detail pd
    LEFT JOIN student s ON s.id = pd.student_id AND s.school_id = pd.school_id
    WHERE pd.id = $1 AND pd.school_id = $2
  `,
};

export const getRecipientByTypeAndId = async (
  recipientType,
  recipientId,
  schoolId
) => {
  if (recipientType === 'lead') {
    return await prisma.lead.findFirst({
      where: {
        id: BigInt(recipientId),
        school_id: BigInt(schoolId)
      }
    });
  }

  if (recipientType === 'student') {
    return await prisma.student.findFirst({
      where: {
        id: BigInt(recipientId),
        school_id: BigInt(schoolId)
      }
    });
  }

  if (recipientType === 'parent') {
    return await prisma.parent_detail.findFirst({
      where: {
        id: BigInt(recipientId),
        school_id: BigInt(schoolId)
      }
    });
  }

  return null;
};

export const getRecipientsByType = async (
  recipientType,
  schoolId,
  search
) => {

  const school_id = BigInt(schoolId);

  if (recipientType === 'lead') {
    return await prisma.lead.findMany({
      where: {
        school_id,
        ...(search && {
          OR: [
            {
              first_name: {
                contains: search,
                mode: 'insensitive'
              }
            },
            {
              last_name: {
                contains: search,
                mode: 'insensitive'
              }
            }
          ]
        })
      },
      take: 200
    });
  }

  if (recipientType === 'student') {
    return await prisma.student.findMany({
      where: {
        school_id
      },
      take: 200
    });
  }

  if (recipientType === 'parent') {
    return await prisma.parent_detail.findMany({
      where: {
        school_id
      },
      take: 200
    });
  }

  return [];
};

export const touchTemplateLastUsed = async (
  templateId,
  schoolId
) => {
  await prisma.message_template.updateMany({
    where: {
      id: BigInt(templateId),
      school_id: BigInt(schoolId)
    },
    data: {
      last_used_at: new Date()
    }
  });
};

export const touchTemplateLastUsedWithClient = async (client, templateId, schoolId) => {
  await client.query(
    `UPDATE message_template
     SET last_used_at = NOW()
     WHERE id = $1 AND school_id = $2`,
    [templateId, schoolId]
  );
};

export const createCommunicationLog = async (client, payload) => {
  if (!payload?.recipient_type) {
    throw new Error('recipient_type is required for communication log insertion.');
  }

  if (!payload?.recipient_id) {
    throw new Error('recipient_id is required for communication log insertion.');
  }

  const result = await client.query(
    `INSERT INTO communication_log (
      school_id, recipient_type, recipient_id, channel, subject, message, status,
      sent_at, delivered_at, opened_at, clicked_at, created_by
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12
    )
    RETURNING *`,
    [
      payload.school_id,
      payload.recipient_type,
      payload.recipient_id,
      payload.channel,
      payload.subject,
      payload.message,
      payload.status,
      payload.sent_at,
      payload.delivered_at || null,
      payload.opened_at || null,
      payload.clicked_at || null,
      payload.created_by,
    ]
  );

  return result.rows[0];
};

export const getCommunicationLogs = async (
  schoolId,
  filters,
  pagination
) => {

  const where = {
    school_id: BigInt(schoolId)
  };

  if (filters.recipient_type) {
    where.recipient_type = filters.recipient_type;
  }

  if (filters.channel) {
    where.channel = filters.channel;
  }

  if (filters.status) {
    where.status = filters.status;
  }

  const total = await prisma.communication_log.count({
    where
  });

  const rows =
    await prisma.communication_log.findMany({
      where,
      orderBy: {
        created_at: 'desc'
      },
      skip: pagination.offset,
      take: pagination.limit
    });

  return {
    rows,
    total
  };
};
export const getCommunicationLogById = async (
  communicationId,
  schoolId
) => {
  return await prisma.communication_log.findFirst({
    where: {
      id: BigInt(communicationId),
      school_id: BigInt(schoolId)
    }
  });
};

export const updateCommunicationStatus = async (
  communicationId,
  schoolId,
  payload
) => {
  const existing = await prisma.communication_log.findFirst({
    where: {
      id: BigInt(communicationId),
      school_id: BigInt(schoolId)
    }
  });

  if (!existing) return null;

  return await prisma.communication_log.update({
    where: {
      id: BigInt(communicationId)
    },
    data: {
      status: payload.status,
      delivered_at: payload.delivered_at || undefined,
      opened_at: payload.opened_at || undefined,
      clicked_at: payload.clicked_at || undefined
    }
  });
};

export const createTemplate = async (
  schoolId,
  payload
) => {
  return await prisma.message_template.create({
    data: {
      school_id: BigInt(schoolId),
      name: payload.name,
      category: payload.category || null,
      subject: payload.subject || null,
      content: payload.content
    }
  });
};

export const getTemplates = async (
  schoolId,
  category
) => {
  return await prisma.message_template.findMany({
    where: {
      school_id: BigInt(schoolId),
      ...(category && { category })
    },
    orderBy: {
      created_at: 'desc'
    }
  });
};

export const updateTemplate = async (
  templateId,
  schoolId,
  payload
) => {
  const existing = await prisma.message_template.findFirst({
    where: {
      id: BigInt(templateId),
      school_id: BigInt(schoolId)
    }
  });

  if (!existing) return null;

  return await prisma.message_template.update({
    where: {
      id: BigInt(templateId)
    },
    data: {
      ...(payload.name !== undefined && { name: payload.name }),
      ...(payload.category !== undefined && {
        category: payload.category
      }),
      ...(payload.subject !== undefined && {
        subject: payload.subject
      }),
      ...(payload.content !== undefined && {
        content: payload.content
      })
    }
  });
};

export const deleteTemplate = async (
  templateId,
  schoolId
) => {
  const result =
    await prisma.message_template.deleteMany({
      where: {
        id: BigInt(templateId),
        school_id: BigInt(schoolId)
      }
    });

  return result.count > 0;
};

export const createScheduledEmail = async (payload) => {
  return await prisma.scheduled_emails.create({
    data: {
      school_id: BigInt(payload.school_id),
      sender_id: payload.sender_id
        ? BigInt(payload.sender_id)
        : null,
      recipient_type: payload.recipient_type,
      recipient_id: payload.recipient_id
        ? BigInt(payload.recipient_id)
        : null,
      recipients: payload.recipients,
      subject: payload.subject,
      message: payload.message,
      attachments: payload.attachments || [],
      scheduled_at: new Date(payload.scheduled_at),
      status: payload.status || 'pending'
    }
  });
};

export const getPendingScheduledEmails = async (
  limit = 50
) => {
  return await prisma.scheduled_emails.findMany({
    where: {
      status: 'pending',
      scheduled_at: {
        lte: new Date()
      }
    },
    orderBy: {
      scheduled_at: 'asc'
    },
    take: Number(limit)
  });
};

export const updateScheduledEmailStatus = async (
  id,
  status
) => {
  return await prisma.scheduled_emails.update({
    where: {
      id: BigInt(id)
    },
    data: {
      status
    }
  });
};

export const createSimpleCommunicationLog = async (payload) => {
  if (!payload?.school_id) {
    throw new Error('school_id is required');
  }

  if (!(payload?.created_by || payload?.sender_id)) {
    throw new Error('created_by is required');
  }

  if (!payload?.recipient_type) {
    throw new Error('recipient_type is required');
  }

  if (!payload?.recipient_id) {
    throw new Error('recipient_id is required');
  }

  return await prisma.communication_log.create({
    data: {
      school_id: BigInt(payload.school_id),
      recipient_type: payload.recipient_type,
      recipient_id: BigInt(payload.recipient_id),
      channel: payload.channel || 'email',
      subject: payload.subject || null,
      message: payload.message || null,
      status: payload.status || 'sent',
      created_by: (
        payload.created_by ||
        payload.sender_id
      ).toString()
    }
  });
};

export const createCampaign = async (
  schoolId,
  payload
) => {
  return await prisma.campaign.create({
    data: {
      school_id: BigInt(schoolId),
      name: payload.name,
      channel: payload.channel,
      status: payload.status || 'draft',
      start_date: payload.start_date
        ? new Date(payload.start_date)
        : null,
      end_date: payload.end_date
        ? new Date(payload.end_date)
        : null
    }
  });
};

export const getCampaigns = async (
  schoolId,
  status
) => {
  return await prisma.campaign.findMany({
    where: {
      school_id: BigInt(schoolId),
      ...(status && { status })
    },
    orderBy: {
      created_at: 'desc'
    }
  });
};

export const getCampaignById = async (
  campaignId,
  schoolId
) => {
  return await prisma.campaign.findFirst({
    where: {
      id: BigInt(campaignId),
      school_id: BigInt(schoolId)
    }
  });
};

export const updateCampaignStatus = async (
  campaignId,
  schoolId,
  status
) => {
  return await prisma.campaign.updateMany({
    where: {
      id: BigInt(campaignId),
      school_id: BigInt(schoolId)
    },
    data: {
      status
    }
  });
};
