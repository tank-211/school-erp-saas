/**
 * middleware/tenantGuards.js
 *
 * Route-level ownership checks for school-owned records. Use after
 * authMiddleware + requireSchool (which sets req.schoolId from the token).
 *
 * Each guard reads the record id from the route param or the request body,
 * looks the record up together with the caller's school, and answers 404 when
 * it belongs to another school (or does not exist). Handlers behind a guard can
 * then keep using the id as before.
 */
import prisma from '../src/lib/prisma.js';

const isId = (value) => /^\d+$/.test(String(value ?? ''));

const makeGuard = ({ model, label, pick }) => async (req, res, next) => {
  try {
    const rawId = pick(req);

    if (!isId(rawId)) {
      return res.status(400).json({ success: false, message: `Valid ${label} id is required` });
    }

    const record = await prisma[model].findFirst({
      where: { id: BigInt(rawId), school_id: req.schoolId },
      select: { id: true },
    });

    if (!record) {
      return res.status(404).json({ success: false, message: `${label[0].toUpperCase()}${label.slice(1)} not found` });
    }

    next();
  } catch (error) {
    next(error);
  }
};

/** Application identified by :id (or body.application_id). */
export const requireOwnedApplication = makeGuard({
  model: 'application',
  label: 'application',
  pick: (req) => req.params.id ?? req.body?.application_id,
});

/** Admission identified by :applicationId (these routes take an admission id) or body.admission_id. */
export const requireOwnedAdmission = makeGuard({
  model: 'admission',
  label: 'admission',
  pick: (req) => req.params.applicationId ?? req.body?.admission_id,
});

/** Lead identified by body.lead_id. */
export const requireOwnedLeadFromBody = makeGuard({
  model: 'lead',
  label: 'lead',
  pick: (req) => req.body?.lead_id,
});
