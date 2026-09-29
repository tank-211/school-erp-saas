import {
  getPipelineService,
  moveLeadStageService
} from "../services/pipelineService.js";
import { serializeBigInt } from "../utils/bigintSerializer.js";

export const getPipeline = async (req, res) => {
  try {
    const columns = await getPipelineService(req.user.schoolId);

    res.json({
      success: true,
      columns
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export const moveLeadStage = async (req, res) => {
  try {
    const data = await moveLeadStageService(
      req.params.id,
      req.body.stage,
      req.user.schoolId,
      req.user.id
    );

    res.json({
      success: true,
      data: serializeBigInt(data)
    });
  } catch (error) {
    res.status(error.statusCode || 500).json({
      success: false,
      message: error.message
    });
  }
};
