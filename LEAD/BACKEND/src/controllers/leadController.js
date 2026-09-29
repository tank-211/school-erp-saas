import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
import {
  createLeadService,
  getAllLeadsService,
  getLeadByIdService,
  updateLeadService,
  deleteLeadService,
  bulkCreateLeadsService,
  assignLeadService,
  getLeadStatsService,
  getLeadDetailsService
} from "../services/leadService.js";
import { successResponse, errorResponse } from "../utils/response.js";
import fs from "fs";
import XLSX from "xlsx";
import { serializeBigInt } from "../utils/bigintSerializer.js";

export const createLead = async (req, res) => {
  try {
    console.log("✅ CONTROLLER HIT, BODY:", req.body);

    const { id, schoolId } = req.user;

    if (!id) {
      throw new Error("Unauthorized: userId missing in token");
    }

    // ✅ FIX: Proper service call
    const lead = await createLeadService(
      {
        ...req.body,
        schoolId,
        assignedTo: id
      },
      id
    );

    // ❌ REMOVE notification from controller (already in service)

    res.status(201).json({ success: true, data: serializeBigInt(lead), message: "Lead created successfully" });

  } catch (error) {
    console.error("CREATE LEAD ERROR:", error);
    res.status(400).json(errorResponse(error.message));
  }
};

export const getLeads = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 6,
      status: req.query.status,
      source: req.query.source,
      counselor: req.query.counselor,
      date: req.query.date,
      search: req.query.search,
      myLeads: req.query.myLeads === "true",
    };

    const result = await getAllLeadsService(filters, req.user.schoolId);

    const transformedLeads = result.leads.map((lead) => ({
      id: lead.id,
      name: `${lead.first_name || ""} ${lead.last_name || ""}`.trim(),
      phone: lead.phone || "",
      status: lead.follow_up_status,
      source: lead.source,
      grade: lead.desired_class || "",
      assignedTo: lead.assigned_to,
      counselor: lead.assigned_to || "Unassigned",
    }));

    return res.status(200).json(
      serializeBigInt({
        success: true,
      data: transformedLeads,
      pagination: result.pagination,
      })
    );

  } catch (error) {
    console.error("GET LEADS ERROR:", error);

    return res.status(500).json({
      success: false,
      message: error.message,
      data: [],
      pagination: {
        total: 0,
        page: 1,
        limit: 6,
        totalPages: 1,
      },
    });
  }
};

export const getLeadById = async (req, res) => {
  try {
    const lead = await getLeadByIdService(req.params.id, req.user.schoolId);
    res.status(200).json(
      successResponse(serializeBigInt(lead), "Lead retrieved successfully")
    );
  } catch (error) {
    res.status(404).json(errorResponse(error.message));
  }
};

export const updateLead = async (req, res) => {
  try {
    const lead = await updateLeadService(req.params.id, req.body, req.user.schoolId);
    res.status(200).json(successResponse(serializeBigInt(lead), "Lead updated successfully"));
  } catch (error) {
    res.status(400).json(errorResponse(error.message));
  }
};

export const deleteLead = async (req, res) => {
  try {
    const result = await deleteLeadService(req.params.id, req.user.schoolId);
    res.status(200).json(successResponse(result, "Lead deleted successfully"));
  } catch (error) {
    res.status(404).json(errorResponse(error.message));
  }
};


const MAX_BULK_ROWS = 500;

// Header names are matched after trimming, removing a BOM/quotes and lower-casing,
// so "Student First Name", "studentFirstName" and "student_first_name" all work.
const normalizeHeader = (key) =>
  String(key)
    .trim()
    .replace(/^\uFEFF/, "")
    .replace(/^'+|'+$/g, "")
    .replace(/[\s_-]+/g, "")
    .toLowerCase();

const pick = (row, ...names) => {
  for (const name of names) {
    const value = row[normalizeHeader(name)];
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
};

export const bulkCreateLeads = async (req, res) => {
  const filePath = req.file?.path;

  try {
    if (!req.file) {
      return res.status(400).json(errorResponse("No file uploaded"));
    }

    // xlsx reads both .xlsx and .csv (the upload box offers both)
    const workbook = XLSX.readFile(filePath, { raw: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows = sheet ? XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false }) : [];

    if (!rawRows.length) {
      return res.status(400).json(errorResponse("File is empty"));
    }

    if (rawRows.length > MAX_BULK_ROWS) {
      return res.status(400).json(errorResponse(`Maximum ${MAX_BULK_ROWS} leads per upload`));
    }

    const validLeads = [];
    const errors = [];

    rawRows.forEach((raw, index) => {
      const row = {};
      Object.keys(raw).forEach((key) => {
        row[normalizeHeader(key)] = raw[key];
      });

      const lead = {
        studentFirstName: pick(row, "studentFirstName", "firstName", "first_name"),
        studentLastName: pick(row, "studentLastName", "lastName", "last_name"),
        fatherPhone: pick(row, "fatherPhone", "phone"),
        fatherEmail: pick(row, "fatherEmail", "email"),
        grade: pick(row, "grade", "desiredClass", "desired_class"),
        source: pick(row, "source") || "bulk_upload",
        status: pick(row, "status").toLowerCase() || "new",
      };

      if (!lead.studentFirstName) {
        errors.push({ row: index + 2, reason: "Missing first name" });
        return;
      }

      if (!lead.fatherPhone) {
        errors.push({ row: index + 2, reason: "Missing phone" });
        return;
      }

      validLeads.push(lead);
    });

    const result = await bulkCreateLeadsService(validLeads, req.user.schoolId, req.user.id);

    res.status(201).json(
      successResponse(
        {
          created: result.count,
          failed: errors.length,
          errors,
        },
        "Bulk upload processed"
      )
    );
  } catch (error) {
    res.status(error.statusCode || 400).json(errorResponse(error.message));
  } finally {
    // The uploaded file holds parents' phone numbers: never keep it on disk
    if (filePath) {
      fs.promises.unlink(filePath).catch(() => {});
    }
  }
};

export const assignLead = async (req, res) => {
  try {

    const lead = await assignLeadService(
      req.params.id,
      req.body.assignedTo,
      req.user.schoolId,
      req.user.id
    );

    res.status(200).json({
      success: true,
      data: serializeBigInt(lead)
    });

  } catch (error) {
    res.status(error.statusCode || 400).json({
      success: false,
      message: error.message
    });
  }
};
export const getLeadStats = async (req, res) => {
  try {
    const stats = await getLeadStatsService(req.user.schoolId);

    res.status(200).json(
      serializeBigInt({
      success: true,
      data: stats,
      })
    );
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getActivities = async (req, res) => {
  try {
    const activities = await prisma.activity.findMany({
      where: {
        lead: {
          school_id: BigInt(req.user.schoolId),
        },
      },
      orderBy: {
        created_at: "desc"
      },
      take: 20,
      include: {
        lead: {
          select: {
            first_name: true,
            last_name: true
          },
        },
        app_user:{
            select: {
                name: true
              }
          }
      }
    });

    res.json({
      success: true,
      data: serializeBigInt(activities)
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
};
export const getLeadDetails = async (req, res) => {
  try {
    console.log("LEAD DETAILS ID:", req.params.id);

    const result = await getLeadDetailsService(
      parseInt(req.params.id),
      req.user.schoolId
    );

    console.log("LEAD DETAILS RESULT:", result);

    if (!result) {
      return res.status(404).json({
        success: false,
        data: null,
        message: "Lead not found",
      });
    }

    console.log("APPLICATION:", result.application);

    res.status(200).json({
      success: true,
      data: serializeBigInt(result),
    });
  } catch (error) {
    console.error("LEAD DETAILS ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

export const getTasksByLead = async (req, res) => {
  try {
    const { leadId } = req.params;

    if (!/^\d+$/.test(String(leadId ?? ""))) {
      return res.status(400).json({ success: false, message: "Invalid lead id" });
    }

    const tasks = await prisma.task.findMany({
      where: {
        lead_id: BigInt(leadId),
        school_id: BigInt(req.user.schoolId),
      },
      orderBy: {
        due_date: "asc",
      },
    });

    res.json({
      success: true,
      data: serializeBigInt(tasks),
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};