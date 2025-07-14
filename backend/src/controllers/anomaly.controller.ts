import { Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiErrors from "../utils/ApiErrors";
import ApiResponse from "../utils/ApiResponse";
import AnomalyAlert from "../models/anomalyAlert.models";
import { AuthenticatedRequest } from "../types/common.types";
import { Types } from "mongoose";

// Get all anomaly alerts for a user
const getAnomalyAlerts = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { 
      page = 1, 
      limit = 10, 
      severity, 
      isResolved, 
      type,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const userId = new Types.ObjectId(req.user._id);
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build filter object
    const filter: any = { userId };
    
    if (severity) {
      filter.severity = severity;
    }
    
    if (isResolved !== undefined) {
      filter.isResolved = isResolved === 'true';
    }
    
    if (type) {
      filter.type = type;
    }

    // Build sort object
    const sort: any = {};
    sort[sortBy as string] = sortOrder === 'desc' ? -1 : 1;

    try {
      const [alerts, totalCount] = await Promise.all([
        AnomalyAlert.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limitNum)
          .select("-__v"),
        AnomalyAlert.countDocuments(filter)
      ]);

      const pagination = {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalItems: totalCount,
        itemsPerPage: limitNum,
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPrevPage: pageNum > 1
      };

      res.status(200).json(
        new ApiResponse(200, { alerts, pagination }, "Anomaly alerts retrieved successfully")
      );
    } catch (error) {
      console.error("Error fetching anomaly alerts:", error);
      throw new ApiErrors(500, "Failed to fetch anomaly alerts");
    }
  }
);

// Get anomaly statistics
const getAnomalyStatistics = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const userId = req.user._id;

    try {
      const statistics = await AnomalyAlert.getStatistics(userId);

      res.status(200).json(
        new ApiResponse(200, statistics, "Anomaly statistics retrieved successfully")
      );
    } catch (error) {
      console.error("Error fetching anomaly statistics:", error);
      throw new ApiErrors(500, "Failed to fetch anomaly statistics");
    }
  }
);

// Mark anomaly alert as resolved
const resolveAnomalyAlert = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { alertId } = req.params;
    const userId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(alertId)) {
      throw new ApiErrors(400, "Invalid alert ID");
    }

    try {
      const alert = await AnomalyAlert.findOne({
        _id: alertId,
        userId
      });

      if (!alert) {
        throw new ApiErrors(404, "Anomaly alert not found");
      }

      if (alert.isResolved) {
        throw new ApiErrors(400, "Anomaly alert is already resolved");
      }

      await alert.resolve(req.user._id);

      res.status(200).json(
        new ApiResponse(200, alert, "Anomaly alert resolved successfully")
      );
    } catch (error) {
      console.error("Error resolving anomaly alert:", error);
      if (error instanceof ApiErrors) throw error;
      throw new ApiErrors(500, "Failed to resolve anomaly alert");
    }
  }
);

// Mark anomaly alert as unresolved
const unresolveAnomalyAlert = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { alertId } = req.params;
    const userId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(alertId)) {
      throw new ApiErrors(400, "Invalid alert ID");
    }

    try {
      const alert = await AnomalyAlert.findOne({
        _id: alertId,
        userId
      });

      if (!alert) {
        throw new ApiErrors(404, "Anomaly alert not found");
      }

      if (!alert.isResolved) {
        throw new ApiErrors(400, "Anomaly alert is already unresolved");
      }

      await alert.unresolve();

      res.status(200).json(
        new ApiResponse(200, alert, "Anomaly alert marked as unresolved successfully")
      );
    } catch (error) {
      console.error("Error unresolving anomaly alert:", error);
      if (error instanceof ApiErrors) throw error;
      throw new ApiErrors(500, "Failed to unresolve anomaly alert");
    }
  }
);

// Delete anomaly alert
const deleteAnomalyAlert = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { alertId } = req.params;
    const userId = new Types.ObjectId(req.user._id);

    if (!Types.ObjectId.isValid(alertId)) {
      throw new ApiErrors(400, "Invalid alert ID");
    }

    try {
      const alert = await AnomalyAlert.findOneAndDelete({
        _id: alertId,
        userId
      });

      if (!alert) {
        throw new ApiErrors(404, "Anomaly alert not found");
      }

      res.status(200).json(
        new ApiResponse(200, null, "Anomaly alert deleted successfully")
      );
    } catch (error) {
      console.error("Error deleting anomaly alert:", error);
      if (error instanceof ApiErrors) throw error;
      throw new ApiErrors(500, "Failed to delete anomaly alert");
    }
  }
);

// Bulk resolve anomaly alerts
const bulkResolveAnomalyAlerts = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { alertIds } = req.body;
    const userId = new Types.ObjectId(req.user._id);

    if (!Array.isArray(alertIds) || alertIds.length === 0) {
      throw new ApiErrors(400, "Alert IDs array is required");
    }

    // Validate all IDs
    for (const id of alertIds) {
      if (!Types.ObjectId.isValid(id)) {
        throw new ApiErrors(400, `Invalid alert ID: ${id}`);
      }
    }

    try {
      const result = await AnomalyAlert.updateMany(
        {
          _id: { $in: alertIds },
          userId,
          isResolved: false
        },
        {
          $set: {
            isResolved: true,
            resolvedAt: new Date(),
            resolvedBy: userId
          }
        }
      );

      res.status(200).json(
        new ApiResponse(200, { 
          resolvedCount: result.modifiedCount,
          totalRequested: alertIds.length
        }, `Successfully resolved ${result.modifiedCount} anomaly alerts`)
      );
    } catch (error) {
      console.error("Error bulk resolving anomaly alerts:", error);
      throw new ApiErrors(500, "Failed to bulk resolve anomaly alerts");
    }
  }
);

// Get anomaly trends (for analytics)
const getAnomalyTrends = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { period = 'monthly', startDate, endDate } = req.query;
    const userId = new Types.ObjectId(req.user._id);

    // Date range setup
    const start = startDate 
      ? new Date(startDate as string) 
      : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Default 90 days
    const end = endDate ? new Date(endDate as string) : new Date();

    let groupBy: any;
    switch (period) {
      case 'daily':
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" },
          day: { $dayOfMonth: "$createdAt" }
        };
        break;
      case 'weekly':
        groupBy = {
          year: { $year: "$createdAt" },
          week: { $week: "$createdAt" }
        };
        break;
      case 'monthly':
      default:
        groupBy = {
          year: { $year: "$createdAt" },
          month: { $month: "$createdAt" }
        };
        break;
    }

    try {
      const trends = await AnomalyAlert.aggregate([
        {
          $match: {
            userId,
            createdAt: { $gte: start, $lte: end }
          }
        },
        {
          $group: {
            _id: groupBy,
            totalAnomalies: { $sum: 1 },
            criticalAnomalies: {
              $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
            },
            warningAnomalies: {
              $sum: { $cond: [{ $eq: ['$severity', 'warning'] }, 1, 0] }
            },
            avgZScore: { $avg: { $abs: '$zScore' } },
            categories: { $addToSet: '$category' },
            sources: { $addToSet: '$source' }
          }
        },
        {
          $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1, "_id.day": 1 }
        }
      ]);

      res.status(200).json(
        new ApiResponse(200, { 
          period,
          dateRange: { start, end },
          trends 
        }, "Anomaly trends retrieved successfully")
      );
    } catch (error) {
      console.error("Error fetching anomaly trends:", error);
      throw new ApiErrors(500, "Failed to fetch anomaly trends");
    }
  }
);

export {
  getAnomalyAlerts,
  getAnomalyStatistics,
  resolveAnomalyAlert,
  unresolveAnomalyAlert,
  deleteAnomalyAlert,
  bulkResolveAnomalyAlerts,
  getAnomalyTrends
};