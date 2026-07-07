import {
  getPipelineService,
  moveLeadStageService
} from "../services/pipelineService.js";

export const getPipeline = async (
  req,
  res
) => {
  try {

    const columns =
      await getPipelineService(
        req.user.schoolId
      );

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

export const moveLeadStage = async (
  req,
  res
) => {
  try {

    const data =
      await moveLeadStageService(
        req.params.id,
        req.body.stage
      );

    res.json({
      success: true,
      data
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: error.message
    });

  }
};