import { Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiErrors from "../utils/ApiErrors";
import ApiResponse from "../utils/ApiResponse";
import { AuthenticatedRequest } from "../types/common.types";
import IncomeService from "../services/income.service";
import * as fs from "fs";

// Add Income
const addIncome = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { icon, source, amount, date, isRecurring, recurringPeriod } =
      req.body;

    // Parse date
    const parsedDate = new Date(date);

    const result = await IncomeService.createIncome({
      userId: req.user._id.toString(),
      icon,
      source,
      amount,
      date: parsedDate,
      isRecurring,
      recurringPeriod,
    });

    res
      .status(201)
      .json(new ApiResponse(201, result, "Income added successfully"));
  }
);

// Get All Income (For Logged-in User)
const getAllIncome = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const {
      page = 1,
      limit = 10,
      sortBy = "date",
      sortOrder = "desc",
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const sortOrderTyped = sortOrder as "asc" | "desc";

    const result = await IncomeService.getAllIncome(req.user._id, {
      page: pageNum,
      limit: limitNum,
      sortBy: sortBy as string,
      sortOrder: sortOrderTyped,
    });

    res
      .status(200)
      .json(new ApiResponse(200, result, "Income retrieved successfully"));
  }
);

// Get Income by ID
const getIncomeById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { id } = req.params;

    const income = await IncomeService.getIncomeById(req.user._id, id);

    res
      .status(200)
      .json(new ApiResponse(200, income, "Income retrieved successfully"));
  }
);

// Update Income
const updateIncome = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { id } = req.params;
    const { icon, source, amount, date, isRecurring, recurringPeriod } =
      req.body;

    // Parse date if provided
    const parsedDate = date ? new Date(date) : undefined;

    const updatedIncome = await IncomeService.updateIncome(req.user._id, id, {
      icon,
      source,
      amount,
      date: parsedDate,
      isRecurring,
      recurringPeriod,
    });

    res
      .status(200)
      .json(new ApiResponse(200, updatedIncome, "Income updated successfully"));
  }
);

// Delete Income
const deleteIncome = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { id } = req.params;

    await IncomeService.deleteIncome(req.user._id, id);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Income deleted successfully"));
  }
);

// Download Income Details in Excel
const downloadIncomeExcel = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { filepath, filename } = await IncomeService.generateIncomeExcel(
      req.user._id
    );

    // Set proper headers for file download
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    // Send file and clean up
    res.download(filepath, filename, (err) => {
      if (err) {
        console.error("Error downloading file:", err);
      }
      // Clean up temp file
      fs.unlink(filepath, (unlinkErr) => {
        if (unlinkErr) {
          console.error("Error deleting temp file:", unlinkErr);
        }
      });
    });
  }
);

// Get Income Statistics
const getIncomeStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { year, month } = req.query;

    const filter = {
      year: year ? parseInt(year as string) : undefined,
      month: month ? parseInt(month as string) : undefined,
    };

    const result = await IncomeService.getIncomeStats(req.user._id, filter);

    res
      .status(200)
      .json(
        new ApiResponse(200, result, "Income statistics retrieved successfully")
      );
  }
);

// Predict Income Source using ML
const predictIncomeSource = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { description } = req.body;

    const result = await IncomeService.predictIncomeSource(description);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          result,
          "Income source prediction completed successfully"
        )
      );
  }
);

// Send Feedback for Income Source Prediction
const sendIncomeSourceFeedback = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { description, source } = req.body;

    const result = await IncomeService.sendIncomeSourceFeedback(
      description,
      source
    );

    res
      .status(200)
      .json(
        new ApiResponse(200, result, "Income source feedback sent successfully")
      );
  }
);

export {
  addIncome,
  getAllIncome,
  getIncomeById,
  updateIncome,
  deleteIncome,
  downloadIncomeExcel,
  getIncomeStats,
  predictIncomeSource,
  sendIncomeSourceFeedback,
};
