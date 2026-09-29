import prisma from "../prisma/index.js";
import AppError from "../utils/AppError.js";

/**
 * Admission pipeline for one school, built from real data:
 * - a lead's application (if any) decides the later stages;
 * - otherwise its follow_up_status decides the early stages.
 *
 * The lead table has no pipeline column (the old `pipelineStage` column was
 * dropped with the old schema), so stages are derived, not stored.
 */
export const PIPELINE_STAGES = [
  { id: "new_inquiry", label: "New Inquiry", color: "#3b82f6" },
  { id: "contacted", label: "Contacted", color: "#8b5cf6" },
  { id: "qualified", label: "Qualified", color: "#0ea5e9" },
  { id: "application", label: "Application", color: "#f59e0b" },
  { id: "admitted", label: "Admitted", color: "#10b981" },
  { id: "lost", label: "Lost", color: "#ef4444" },
];

const STATUS_TO_STAGE = {
  new: "new_inquiry",
  pending: "new_inquiry",
  contacted: "contacted",
  interested: "qualified",
  qualified: "qualified",
  converted: "admitted",
  admitted: "admitted",
  inactive: "lost",
  lost: "lost",
  "not-interested": "lost",
};

// Stages a user can move a lead into by hand, and the status each one sets.
// Application and admitted come from the application workflow, not a drag.
const MANUAL_STAGE_STATUS = {
  new_inquiry: "new",
  contacted: "contacted",
  qualified: "qualified",
  lost: "lost",
};

const stageFor = (lead) => {
  const apps = lead.application || [];
  if (apps.some((a) => a.status === "admission_completed")) return "admitted";
  if (apps.some((a) => a.status !== "rejected")) return "application";
  return STATUS_TO_STAGE[String(lead.follow_up_status || "").toLowerCase()] || "new_inquiry";
};

const relativeTime = (date) => {
  if (!date) return "";
  const days = Math.floor((Date.now() - new Date(date).getTime()) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
};

export const getPipelineService = async (schoolId) => {
  const sid = BigInt(schoolId);

  const [leads, users] = await Promise.all([
    prisma.lead.findMany({
      where: { school_id: sid },
      select: {
        id: true,
        first_name: true,
        last_name: true,
        phone: true,
        email: true,
        desired_class: true,
        follow_up_status: true,
        assigned_to: true,
        created_at: true,
        application: { select: { status: true } },
      },
      orderBy: { created_at: "desc" },
    }),
    prisma.user.findMany({
      where: { school_id: sid },
      select: { id: true, name: true },
    }),
  ]);

  // lead.assigned_to is a text column holding the user id
  const userNames = new Map(users.map((u) => [String(u.id), u.name]));

  const byStage = new Map(PIPELINE_STAGES.map((s) => [s.id, []]));
  for (const lead of leads) {
    byStage.get(stageFor(lead)).push({
      id: Number(lead.id),
      name: `${lead.first_name} ${lead.last_name || ""}`.trim(),
      grade: lead.desired_class || "N/A",
      phone: lead.phone || "",
      email: lead.email || "",
      counselor: userNames.get(String(lead.assigned_to)) || "Unassigned",
      time: relativeTime(lead.created_at),
      // No scoring or fee value exists yet; the UI hides empty values
      score: null,
      value: null,
    });
  }

  // Conversion = share of all active (not lost) leads that reached this stage or later
  const activeOrder = PIPELINE_STAGES.filter((s) => s.id !== "lost").map((s) => s.id);
  const activeTotal = activeOrder.reduce((n, id) => n + byStage.get(id).length, 0);

  return PIPELINE_STAGES.map((stage) => {
    const position = activeOrder.indexOf(stage.id);
    const reached =
      position === -1
        ? byStage.get(stage.id).length
        : activeOrder.slice(position).reduce((n, id) => n + byStage.get(id).length, 0);
    return {
      ...stage,
      conversion:
        position === -1 || activeTotal === 0 ? null : Math.round((reached / activeTotal) * 100),
      leads: byStage.get(stage.id),
    };
  });
};

export const moveLeadStageService = async (leadId, stage, schoolId, actorId) => {
  if (!/^\d+$/.test(String(leadId ?? ""))) {
    throw new AppError("Invalid lead id", 400);
  }

  const status = MANUAL_STAGE_STATUS[stage];
  if (!status) {
    throw new AppError(
      `Stage must be one of: ${Object.keys(MANUAL_STAGE_STATUS).join(", ")}`,
      400
    );
  }

  const lead = await prisma.lead.findFirst({
    where: { id: BigInt(leadId), school_id: BigInt(schoolId) },
    select: { id: true },
  });

  if (!lead) {
    throw new AppError("Lead not found", 404);
  }

  const updated = await prisma.lead.update({
    where: { id: lead.id },
    data: { follow_up_status: status, updated_at: new Date() },
  });

  await prisma.activity.create({
    data: {
      lead_id: lead.id,
      activity_type: "STAGE_CHANGED",
      notes: `Moved to ${stage}`,
      created_by: BigInt(actorId),
    },
  });

  return updated;
};
