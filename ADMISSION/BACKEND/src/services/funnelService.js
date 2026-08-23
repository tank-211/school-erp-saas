import prisma from '../lib/prisma.js';

export async function getAdmissionFunnel(schoolId) {
  try {
    const schoolIdBigInt = BigInt(schoolId);

    console.log(
      '🔍 [Funnel Service] Running Prisma query for schoolId:',
      schoolId
    );

    const [inquiry, contacted, interested, visit, applied, enrolled] =
      await Promise.all([
        prisma.lead.count({
          where: {
            school_id: schoolIdBigInt,
          },
        }),

        prisma.lead.count({
          where: {
            school_id: schoolIdBigInt,
            follow_up_status: 'contacted',
          },
        }),

        prisma.lead.count({
          where: {
            school_id: schoolIdBigInt,
            follow_up_status: 'interested',
          },
        }),

        prisma.lead.count({
          where: {
            school_id: schoolIdBigInt,
            follow_up_status: 'visit',
          },
        }),

        prisma.application.count({
          where: {
            school_id: schoolIdBigInt,
            lead_id: {
              not: null,
            },
          },
        }),

        prisma.application.count({
          where: {
            school_id: schoolIdBigInt,
            lead_id: {
              not: null,
            },
            status: 'approved',
          },
        }),
      ]);

    const result = {
      inquiry,
      contacted,
      interested,
      visit,
      applied,
      enrolled,
    };

    console.log('📦 [Funnel Service] Prisma Result:', result);

    return result;
  } catch (err) {
    console.error('[Funnel] Error:', err);
    throw err;
  }
}