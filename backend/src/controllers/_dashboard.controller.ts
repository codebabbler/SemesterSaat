import { Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiErrors from "../utils/ApiErrors";
import ApiResponse from "../utils/ApiResponse";
import { AuthenticatedRequest } from "../types/common.types";
import DashboardService from "../services/dashboard.service";

// Get Dashboard Data
const getDashboardData = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { period = 30, limit = 5 } = req.query;

    const periodDays = parseInt(period as string);
    const limitNum = parseInt(limit as string);

    const dashboardData = await DashboardService.getDashboardData(req.user._id, {
      period: periodDays,
      limit: limitNum,
    });

    res.status(200).json(
      new ApiResponse(200, dashboardData, "Dashboard data retrieved successfully")
    );
  }
);

// Get Financial Summary
const getFinancialSummary = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : undefined;
    const end = endDate ? new Date(endDate as string) : undefined;

    const summary = await DashboardService.getFinancialSummary(req.user._id, {
      startDate: start,
      endDate: end,
    });

    res.status(200).json(
      new ApiResponse(200, summary, "Financial summary retrieved successfully")
    );
  }
);

// Get Cash Flow Analysis
const getCashFlowAnalysis = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { period = "monthly" } = req.query;

    const cashFlow = await DashboardService.getCashFlowAnalysis(req.user._id, {
      period: period as 'daily' | 'weekly' | 'monthly' | 'yearly',
    });

    res.status(200).json(
      new ApiResponse(200, cashFlow, "Cash flow analysis retrieved successfully")
    );
  }
);

export {
  getDashboardData,
  getFinancialSummary,
  getCashFlowAnalysis,
};