/**
 * middlewares/tenantGuards.js
 *
 * Route-level ownership checks. Use after authMiddleware (req.user.schoolId
 * comes from the verified token). Each guard loads the record by the id in the
 * URL together with the caller's school and answers 404 when it belongs to
 * another school, so handlers behind it can keep using the id as before.
 */
import prisma from "../prisma/index.js";

const isId = (value) => /^\d+$/.test(String(value ?? ""));

const schoolOf = (req) => {
  const id = req.user?.schoolId;
  return isId(id) ? BigInt(id) : null;
};

const notFound = (res, label) =>
  res.status(404).json({ success: false, message: `${label} not found` });

const badId = (res, label) =>
  res.status(400).json({ success: false, message: `Invalid ${label.toLowerCase()} id` });

const guard = (label, check) => async (req, res, next) => {
  try {
    const schoolId = schoolOf(req);
    if (!schoolId) {
      return res.status(403).json({ success: false, message: "This action requires a school user account." });
    }
    const result = await check(req, schoolId);
    if (result === "bad-id") return badId(res, label);
    if (!result) return notFound(res, label);
    next();
  } catch (error) {
    next(error);
  }
};

const leadInSchool = (leadId, schoolId) =>
  prisma.lead.findFirst({ where: { id: BigInt(leadId), school_id: schoolId }, select: { id: true } });

/** Application in :id */
export const requireOwnedApplication = guard("Application", async (req, schoolId) => {
  if (!isId(req.params.id)) return "bad-id";
  return prisma.application.findFirst({
    where: { id: BigInt(req.params.id), school_id: schoolId },
    select: { id: true },
  });
});

/** Application document in :documentId (checked through its application) */
export const requireOwnedDocument = guard("Document", async (req, schoolId) => {
  if (!isId(req.params.documentId)) return "bad-id";
  const doc = await prisma.applicationDocument.findFirst({
    where: { id: BigInt(req.params.documentId) },
    select: { application_id: true },
  });
  if (!doc) return null;
  return prisma.application.findFirst({
    where: { id: doc.application_id, school_id: schoolId },
    select: { id: true },
  });
});

/** Task in :id */
export const requireOwnedTask = guard("Task", async (req, schoolId) => {
  if (!isId(req.params.id)) return "bad-id";
  return prisma.task.findFirst({
    where: { id: BigInt(req.params.id), school_id: schoolId },
    select: { id: true },
  });
});

/** Lead in :leadId */
export const requireOwnedLeadParam = guard("Lead", async (req, schoolId) => {
  if (!isId(req.params.leadId)) return "bad-id";
  return leadInSchool(req.params.leadId, schoolId);
});

/**
 * Communication log in :id. Older LEAD rows have no school_id, so a row is
 * owned when its school_id matches, or when it has none and its recipient lead
 * belongs to the caller's school.
 */
export const requireOwnedCommunication = guard("Communication", async (req, schoolId) => {
  if (!isId(req.params.id)) return "bad-id";
  const comm = await prisma.communication.findFirst({
    where: { id: BigInt(req.params.id) },
    select: { school_id: true, recipient_type: true, recipient_id: true },
  });
  if (!comm) return null;
  if (comm.school_id !== null && comm.school_id !== undefined) {
    return BigInt(comm.school_id) === schoolId;
  }
  if (comm.recipient_type === "lead" && comm.recipient_id !== null && comm.recipient_id !== undefined) {
    return leadInSchool(comm.recipient_id, schoolId);
  }
  return null;
});
