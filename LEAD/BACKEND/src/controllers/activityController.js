import {
  createActivityService,
  getActivitiesByLeadService,
  updateActivityService,
  deleteActivityService,
  getRecentActivitiesService,
} from "../services/activityService.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { serializeBigInt } from "../utils/bigintSerializer.js";

// All activity queries are limited to the caller's school (see activityService.js).

const fail = (res, error, fallback = 500) =>
  res.status(error.statusCode || fallback).json(errorResponse(error.message));

export const createActivity = async (req, res) => {
  try {
    const activity = await createActivityService(req.body, req.user.id, req.user.schoolId);
    res.status(201).json(successResponse(serializeBigInt(activity), "Activity created successfully"));
  } catch (error) {
    fail(res, error, 400);
  }
};

export const getActivities = async (req, res) => {
  try {
    const filters = {
      page: parseInt(req.query.page) || 1,
      limit: parseInt(req.query.limit) || 20,
      type: req.query.type,
    };
    const result = await getActivitiesByLeadService(req.query.leadId, req.user.schoolId, filters);
    res.status(200).json(successResponse(serializeBigInt(result), "Activities retrieved successfully"));
  } catch (error) {
    fail(res, error);
  }
};

export const updateActivity = async (req, res) => {
  try {
    const activity = await updateActivityService(req.params.id, req.body, req.user.schoolId);
    res.status(200).json(successResponse(serializeBigInt(activity), "Activity updated successfully"));
  } catch (error) {
    fail(res, error, 400);
  }
};

export const deleteActivity = async (req, res) => {
  try {
    const result = await deleteActivityService(req.params.id, req.user.schoolId);
    res.status(200).json(successResponse(result, "Activity deleted successfully"));
  } catch (error) {
    fail(res, error, 404);
  }
};

export const getRecentActivities = async (req, res) => {
  try {
    const activities = await getRecentActivitiesService(req.user.schoolId, req.query.limit);
    res.status(200).json(successResponse(serializeBigInt(activities), "Recent activities retrieved successfully"));
  } catch (error) {
    fail(res, error);
  }
};
