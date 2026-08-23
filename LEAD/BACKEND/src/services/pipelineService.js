import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PIPELINE_STAGES = [
  {
    id: "new_inquiry",
    label: "New Inquiry",
    color: "#3b82f6"
  },
  {
    id: "contacted",
    label: "Contacted",
    color: "#8b5cf6"
  },
  {
    id: "qualified",
    label: "Qualified",
    color: "#3b82f6"
  },
  {
    id: "application",
    label: "Application Submitted",
    color: "#f59e0b"
  },
  {
    id: "fee_paid",
    label: "Fee Paid",
    color: "#10b981"
  }
];

export const getPipelineService = async (schoolId) => {
  const leads = await prisma.lead.findMany({
    where: { schoolId },
    include: {
      assignedUser: true
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return PIPELINE_STAGES.map(stage => ({
    ...stage,
    conversion: 0,
    leads: leads
      .filter(
        lead => lead.pipelineStage === stage.id
      )
      .map(lead => ({
        id: lead.id,
        name:
          `${lead.studentFirstName} ${lead.studentLastName}`,
        grade: lead.grade || "N/A",
        score: 50,
        phone: lead.fatherPhone,
        email: lead.fatherEmail || "",
        counselor:
          lead.assignedUser?.name || "Unassigned",
        time:
          new Date(lead.createdAt).toLocaleDateString(),
        value: "₹30K"
      }))
  }));
};

export const moveLeadStageService = async (
  leadId,
  stage
) => {
  return prisma.lead.update({
    where: {
      id: Number(leadId)
    },
    data: {
      pipelineStage: stage
    }
  });
};