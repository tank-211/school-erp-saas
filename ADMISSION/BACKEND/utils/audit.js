/**
 * utils/audit.js
 *
 * Records who did what, for the Security & Compliance audit log.
 * Never throws: a failed audit write must not fail the action being recorded.
 *
 *   await recordAudit(req, { action: 'application.approved', entity: 'application',
 *                            entityId: app.id, summary: 'Approved APP-12' });
 */
import prisma from '../src/lib/prisma.js';

const toBigInt = (value) => {
  try {
    return value === null || value === undefined || value === '' ? null : BigInt(value);
  } catch {
    return null;
  }
};

const plain = (value) =>
  value === undefined ? undefined : JSON.parse(JSON.stringify(value, (_, v) => (typeof v === 'bigint' ? v.toString() : v)));

export const recordAudit = async (
  req,
  { action, entity, entityId, summary, schoolId, userId, status = 'success', oldData, newData }
) => {
  try {
    const school = toBigInt(schoolId ?? req?.schoolId ?? req?.user?.school_id);
    const entity_id = toBigInt(entityId);
    if (!school || entity_id === null || !action || !entity) return;
    await prisma.audit_log.create({
      data: {
        school_id: school,
        user_id: toBigInt(userId ?? req?.user?.id),
        action: String(action).slice(0, 100),
        entity: String(entity).slice(0, 100),
        entity_id,
        status,
        change_summary: summary ? String(summary).slice(0, 1000) : null,
        old_data: plain(oldData),
        new_data: plain(newData),
        ip_address: req?.ip ? String(req.ip).slice(0, 45) : null,
        user_agent: typeof req?.get === 'function' ? String(req.get('User-Agent') || '').slice(0, 500) || null : null,
      },
    });
  } catch (error) {
    console.error('Audit log write failed:', error.message);
  }
};
