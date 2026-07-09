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
import csv from "csv-parser";
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


export const bulkCreateLeads = async (req, res) => {
  
  console.log("BODY:", req.body);
  console.log("FILE:", req.file);

  const { id } = req.user; // ✅ ADD HERE

  try {
    if (!req.file) {
      return res.status(400).json(errorResponse("No file uploaded"));
    }

    const results = [];

    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on("data", (data) => results.push(data))
      .on("end", async () => {
        try {
          if (!results.length) {
            return res.status(400).json(errorResponse("CSV is empty"));
          }

            const validLeads = [];
            const errors = [];

            results.forEach((row, index) => {
              const cleanRow = {};

              // 🔥 clean ALL keys properly
              Object.keys(row).forEach((key) => {
                const cleanKey = key
                  .trim()
                  .replace(/^\uFEFF/, "")   // remove BOM
                  .replace(/^'+|'+$/g, ""); // remove quotes

                cleanRow[cleanKey] = row[key];
              });
              
              const lead = {
                studentFirstName: cleanRow.studentFirstName?.trim(),
                studentLastName: cleanRow.studentLastName?.trim(),
                fatherName: cleanRow.fatherName?.trim() || "Unknown",
                fatherPhone: cleanRow.fatherPhone?.trim(),
                grade: cleanRow.grade?.trim(),
                source: cleanRow.source?.trim() || "manual",
                status: cleanRow.status?.trim() || "new",
                assignedTo: id,
                schoolId: req.user.schoolId,
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


            const result = await bulkCreateLeadsService(validLeads);


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
        } catch (err) {
          res.status(500).json(errorResponse(err.message));
        }
      })
      .on("error", (err) => {
        console.error("CSV ERROR:", err);
        res.status(500).json(errorResponse("CSV parsing failed"));
      });

  } catch (error) {
    res.status(400).json(errorResponse(error.message));
  }
};
export const assignLead = async (req, res) => {
  try {

    const lead = await assignLeadService(
      req.params.id,
      req.body.assignedTo,
      req.user.schoolId
    );

    res.status(200).json({
      success: true,
      data: serializeBigInt(lead)
    });

  } catch (error) {
    res.status(400).json({
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

    const tasks = await prisma.task.findMany({
      where: {
        leadId: Number(leadId),
      },
      orderBy: {
        dueDate: "asc",
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