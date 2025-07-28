import { Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiErrors from "../utils/ApiErrors";
import ApiResponse from "../utils/ApiResponse";
import { AuthenticatedRequest } from "../types/common.types";
import AnomalyService from "../services/anomaly.service";

// Get anomalous transactions
const getAnomalousTransactions = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { 
      transactionType, 
      page = 1, 
      limit = 10 
    } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    if (pageNum < 1 || limitNum < 1) {
      throw new ApiErrors(400, "Page and limit must be positive numbers");
    }

    if (limitNum > 100) {
      throw new ApiErrors(400, "Limit cannot exceed 100");
    }

    // Validate transaction type if provided
    if (transactionType && !['expense', 'income'].includes(transactionType as string)) {
      throw new ApiErrors(400, "Transaction type must be either 'expense' or 'income'");
    }

    const result = await AnomalyService.getAnomalousTransactions(
      req.user._id,
      transactionType as 'expense' | 'income' | undefined,
      limitNum,
      pageNum
    );

    res.status(200).json(
      new ApiResponse(200, result, "Anomalous transactions retrieved successfully")
    );
  }
);

// Get anomaly statistics
const getAnomalyStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { transactionType } = req.query;

    // Validate transaction type if provided
    if (transactionType && !['expense', 'income'].includes(transactionType as string)) {
      throw new ApiErrors(400, "Transaction type must be either 'expense' or 'income'");
    }

    const stats = await AnomalyService.getAnomalyStats(
      req.user._id,
      transactionType as 'expense' | 'income' | undefined
    );

    res.status(200).json(
      new ApiResponse(200, stats, "Anomaly statistics retrieved successfully")
    );
  }
);

// Reset category anomaly stats
const resetCategoryStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { category, transactionType } = req.body;

    if (!category || !transactionType) {
      throw new ApiErrors(400, "Category and transaction type are required");
    }

    if (!['expense', 'income'].includes(transactionType)) {
      throw new ApiErrors(400, "Transaction type must be either 'expense' or 'income'");
    }

    await AnomalyService.resetCategoryStats(
      req.user._id,
      category.trim(),
      transactionType as 'expense' | 'income'
    );

    res.status(200).json(
      new ApiResponse(200, null, `Category '${category}' anomaly statistics reset successfully`)
    );
  }
);

// Reset all anomaly stats for a transaction type
const resetAllStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { transactionType } = req.body;

    if (!transactionType) {
      throw new ApiErrors(400, "Transaction type is required");
    }

    if (!['expense', 'income'].includes(transactionType)) {
      throw new ApiErrors(400, "Transaction type must be either 'expense' or 'income'");
    }

    await AnomalyService.resetAllStats(
      req.user._id,
      transactionType as 'expense' | 'income'
    );

    res.status(200).json(
      new ApiResponse(200, null, `All ${transactionType} anomaly statistics reset successfully`)
    );
  }
);

export {
  getAnomalousTransactions,
  getAnomalyStats,
  resetCategoryStats,
  resetAllStats,
};