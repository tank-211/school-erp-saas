import {
  getApplicationsService,
  getApplicationStatsService,
  createApplicationFromLeadService,
  getApplicationByIdService,
  addDocumentService,
  verifyDocumentService,
  updateApplicationStatusService, 
  deleteDocumentService,
  updateStudentInfoService,
  updateParentInfoService
} from "../services/applicationService.js";
import { serializeBigInt } from "../utils/bigintSerializer.js";

export const getApplications = async (req, res) => {
  try {
    const data = await getApplicationsService(
      req.user.schoolId
    );

    res.json({
      success: true,
      data: serializeBigInt(data)
    });
  } catch (error) {
    console.error("APPLICATION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const getApplicationStats = async (req, res) => {
  try {
    const data = await getApplicationStatsService(
      req.user.schoolId
    );

    res.json({
      success: true,
      data: serializeBigInt(data)
    });
  } catch (error) {
    console.error("APPLICATION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const createApplicationFromLead = async (req, res) => {
  try {
    const data =
      await createApplicationFromLeadService(
        req.params.leadId,
        req.user.schoolId,
        req.user.id
      );

    res.json({
      success: true,
      data: serializeBigInt(data)
    });

  } catch (error) {
    console.error("APPLICATION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
export const getApplicationById = async (req, res) => {
  try {
    const data = await getApplicationByIdService(
      req.params.id,
      req.user.schoolId
    );

    res.json({
      success: true,
      data: serializeBigInt(data)
    });

  } catch (error) {
    console.error("APPLICATION ERROR:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
export const addDocument = async (req, res) => {
  try {

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Please upload a file."
      });
    }

    const data = await addDocumentService(
      req.params.id,
      {
        documentType: req.body.documentType,
        fileName: req.file.originalname,
        filePath: req.file.path,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedBy: req.user.id
      }
    );

    res.json({
      success: true,
      data: serializeBigInt(data)
    });

  } catch (error) {
    console.error("APPLICATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const verifyDocument = async (
  req,
  res
) => {

  const data =
    await verifyDocumentService(
      req.params.documentId
    );

  res.json({
    success: true,
    data: serializeBigInt(data)
  });

};

export const updateApplicationStatus = async (req, res) => {
  try {
    const data = await updateApplicationStatusService(
      req.params.id,
      req.body.status
    );

    res.json({
      success: true,
      data: serializeBigInt(data)
    });
  } catch (error) {
    console.error("APPLICATION ERROR:", error);

    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const deleteDocument = async (req, res) => {

  try {

    await deleteDocumentService(
      req.params.documentId
    );

    res.json({
      success: true,
      message: "Document deleted successfully."
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }

};

export const updateStudentInfo = async (req, res) => {
  try {

    console.log("APPLICATION ID:", req.params.id);
    console.log("REQUEST BODY:", req.body);

    const data = await updateStudentInfoService(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      data: serializeBigInt(data)
    });

  } catch (error) {

    console.error("STUDENT INFO ERROR:");
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};

export const updateParentInfo = async (req, res) => {
  try {

    console.log("PARENT BODY:", req.body);

    const data = await updateParentInfoService(
      req.params.id,
      req.body
    );

    res.json({
      success: true,
      data: serializeBigInt(data)
    });

  } catch (error) {

    console.error("PARENT INFO ERROR:");
    console.error(error);

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};