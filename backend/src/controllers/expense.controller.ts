import { Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiErrors from "../utils/ApiErrors";
import ApiResponse from "../utils/ApiResponse";
import { AuthenticatedRequest } from "../types/common.types";
import ExpenseService from "../services/expense.service";
import * as fs from "fs";

// Add Expense
const addExpense = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const {
      icon,
      description,
      category,
      amount,
      date,
      isRecurring,
      recurringPeriod,
    } = req.body;

    // Parse date
    const parsedDate = new Date(date);

    const result = await ExpenseService.createExpense({
      userId: req.user._id.toString(),
      icon,
      category,
      amount,
      date: parsedDate,
      isRecurring,
      recurringPeriod,
    });

    res
      .status(201)
      .json(new ApiResponse(201, result, "Expense added successfully"));
  }
);

const getAllExpenses = asyncHandler(
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

    const result = await ExpenseService.getAllExpenses(req.user._id, {
      page: pageNum,
      limit: limitNum,
      sortBy: sortBy as string,
      sortOrder: sortOrderTyped,
    });

    res
      .status(200)
      .json(new ApiResponse(200, result, "Expenses retrieved successfully"));
  }
);

// Get Expense by ID
const getExpenseById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { id } = req.params;

    const expense = await ExpenseService.getExpenseById(req.user._id, id);

    res
      .status(200)
      .json(new ApiResponse(200, expense, "Expense retrieved successfully"));
  }
);

// Update Expense
const updateExpense = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { id } = req.params;
    const {
      icon,
      description,
      category,
      amount,
      date,
      isRecurring,
      recurringPeriod,
    } = req.body;

    // Parse date if provided
    const parsedDate = date ? new Date(date) : undefined;

    const updatedExpenseWithAnomaly = await ExpenseService.updateExpense(
      req.user._id,
      id,
      {
        icon,
        category,
        amount,
        date: parsedDate,
        isRecurring,
        recurringPeriod,
      }
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          updatedExpenseWithAnomaly,
          "Expense updated successfully"
        )
      );
  }
);

// Delete Expense
const deleteExpense = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { id } = req.params;

    await ExpenseService.deleteExpense(req.user._id, id);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Expense deleted successfully"));
  }
);

// Get Expenses by Category
const getExpensesByCategory = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { category } = req.params;

    const expenses = await ExpenseService.getExpensesByCategory(
      req.user._id,
      category
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          expenses,
          "Expenses by category retrieved successfully"
        )
      );
  }
);

// Download Expense Details in Excel
const downloadExpenseExcel = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { filepath, filename } = await ExpenseService.generateExpenseExcel(
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

// Get Expense Statistics
const getExpenseStats = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { year, month, category } = req.query;

    const filter = {
      year: year ? parseInt(year as string) : undefined,
      month: month ? parseInt(month as string) : undefined,
      category: category as string,
    };

    const result = await ExpenseService.getExpenseStats(req.user._id, filter);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          result,
          "Expense statistics retrieved successfully"
        )
      );
  }
);

// Get Monthly Expense Trends
const getMonthlyExpenseTrends = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { year = new Date().getFullYear() } = req.query;

    const trends = await ExpenseService.getMonthlyExpenseTrends(
      req.user._id,
      parseInt(year as string)
    );

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          trends,
          "Monthly expense trends retrieved successfully"
        )
      );
  }
);

// Predict Expense Category using ML
const predictExpenseCategory = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { description } = req.body;

    const result = await ExpenseService.predictExpenseCategory(description);

    res
      .status(200)
      .json(
        new ApiResponse(
          200,
          result,
          "Category prediction completed successfully"
        )
      );
  }
);

// Send Feedback for Expense Category Prediction
const sendExpenseCategoryFeedback = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { description, category } = req.body;

    const result = await ExpenseService.sendExpenseCategoryFeedback(
      description,
      category
    );

    res
      .status(200)
      .json(new ApiResponse(200, result, "Feedback sent successfully"));
  }
);

export {
  addExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  getExpensesByCategory,
  downloadExpenseExcel,
  getExpenseStats,
  getMonthlyExpenseTrends,
  predictExpenseCategory,
  sendExpenseCategoryFeedback,
};
