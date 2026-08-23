import {
  createActivityService,
  getActivitiesByLeadService,
  updateActivityService,
  deleteActivityService,
  getRecentActivitiesService,
} from "../services/activityService.js";
import { successResponse, errorResponse } from "../utils/response.js";

export const createActivity = async (req, res) => {
  try {
    const activity = await createActivityService(req.body, req.userId);
    res.status(201).json(successResponse(activity, "Activity created successfully"));
  } catch (error) {
    res.status(400).json(errorResponse(error.message));
  }
};

export const getActivities = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      type: req.query.type,
    };

    const result = await getActivitiesByLeadService(req.query.leadId, filters);
    res.status(200).json(successResponse(result, "Activities retrieved successfully"));
  } catch (error) {
    res.status(500).json(errorResponse(error.message));
  }
};

export const updateActivity = async (req, res) => {
  try {
    const activity = await updateActivityService(req.params.id, req.body);
    res.status(200).json(successResponse(activity, "Activity updated successfully"));
  } catch (error) {
    res.status(400).json(errorResponse(error.message));
  }
};

export const deleteActivity = async (req, res) => {
  try {
    const result = await deleteActivityService(req.params.id);
    res.status(200).json(successResponse(result, "Activity deleted successfully"));
  } catch (error) {
    res.status(404).json(errorResponse(error.message));
  }
};

export const getRecentActivities = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const activities = await getRecentActivitiesService(limit);
    res.status(200).json(successResponse(activities, "Recent activities retrieved successfully"));
  } catch (error) {
    res.status(500).json(errorResponse(error.message));
  }
};
