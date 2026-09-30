/**
 * controllers/securityController.js
 * Security & Compliance page: staff accounts by role and the audit log, for
 * the caller's school. School admins only (isAdmin on the routes).
 *
 *   GET /api/security/overview
 *   GET /api/security/audit-logs?page=1&limit=25&action=application.approved
 */
import prisma from '../src/lib/prisma.js';

const ROLE_LABELS = { admin: 'Admin', counselor: 'Counselor', accountant: 'Accountant', super_admin: 'Super Admin' };

export const getSecurityOverview = async (req, res) => {
  try {
    const [users, auditTotal, loginsLast7Days] = await Promise.all([
      prisma.app_user.findMany({
        where: { school_id: req.schoolId },
        select: { role: true, status: true },
      }),
      prisma.audit_log.count({ where: { school_id: req.schoolId } }),
      prisma.audit_log.count({
        where: { school_id: req.schoolId, action: 'auth.login', created_at: { gte: new Date(Date.now() - 7 * 86400000) } },
      }),
    ]);

    const byRole = new Map();
    for (const u of users) {
      const role = u.role || 'unknown';
      const entry = byRole.get(role) || { role, label: ROLE_LABELS[role] || role, users: 0, active: 0 };
      entry.users += 1;
      if (u.status === 'active') entry.active += 1;
      byRole.set(role, entry);
    }

    res.json({
      success: true,
      data: {
        total_users: users.length,
        active_users: users.filter((u) => u.status === 'active').length,
        roles: [...byRole.values()].sort((a, b) => b.users - a.users),
        audit_total: auditTotal,
        logins_last_7_days: loginsLast7Days,
      },
    });
  } catch (error) {
    console.error('Security overview error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load security overview' });
  }
};

export const getAuditLogs = async (req, res) => {
  const page = Math.max(Number(req.query.page) || 1, 1);
  const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
  const where = {
    school_id: req.schoolId,
    ...(req.query.action ? { action: String(req.query.action) } : {}),
  };
  try {
    const [rows, total] = await Promise.all([
      prisma.audit_log.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          action: true,
          entity: true,
          entity_id: true,
          status: true,
          change_summary: true,
          ip_address: true,
          created_at: true,
          app_user: { select: { name: true, email: true } },
        },
      }),
      prisma.audit_log.count({ where }),
    ]);
    res.json({
      success: true,
      data: rows.map((r) => ({
        id: String(r.id),
        user: r.app_user?.name || r.app_user?.email || 'System',
        action: r.action,
        entity: r.entity,
        entity_id: String(r.entity_id),
        status: r.status,
        summary: r.change_summary,
        ip_address: r.ip_address,
        created_at: r.created_at,
      })),
      pagination: { page, limit, total },
    });
  } catch (error) {
    console.error('Audit log error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to load the audit log' });
  }
};
