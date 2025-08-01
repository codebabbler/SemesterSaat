import { Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiErrors from "../utils/ApiErrors";
import ApiResponse from "../utils/ApiResponse";
import { AuthenticatedRequest } from "../types/common.types";
import { mlService, type PredictionResponse, type FeedbackResponse } from "../services/mlService";
import * as xlsx from "xlsx";
import * as fs from "fs";

// Add Expense
const addExpense = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { icon, category, amount, date, isRecurring, recurringPeriod } = req.body;

    // Parse date
    const parsedDate = new Date(date);

    // Validate recurring fields
    if (isRecurring && !recurringPeriod) {
      throw new ApiErrors(400, "Recurring period is required for recurring expenses");
    }

    if (isRecurring && !["daily", "weekly", "monthly", "yearly"].includes(recurringPeriod)) {
      throw new ApiErrors(400, "Invalid recurring period");
    }

    // Calculate next recurring date
    let nextRecurringDate: Date | undefined;
    if (isRecurring && recurringPeriod) {
      const baseDate = new Date(parsedDate);
      switch (recurringPeriod) {
        case "daily":
          nextRecurringDate = new Date(baseDate.setDate(baseDate.getDate() + 1));
          break;
        case "weekly":
          nextRecurringDate = new Date(baseDate.setDate(baseDate.getDate() + 7));
          break;
        case "monthly":
          nextRecurringDate = new Date(baseDate.setMonth(baseDate.getMonth() + 1));
          break;
        case "yearly":
          nextRecurringDate = new Date(baseDate.setFullYear(baseDate.getFullYear() + 1));
          break;
      }
    }

    const newExpense = await Expense.create({
      userId: req.user._id,
      icon,
      category,
      amount,
      date: parsedDate,
      isRecurring: isRecurring || false,
      recurringPeriod: isRecurring ? recurringPeriod : undefined,
      nextRecurringDate,
    });

    res.status(201).json(
      new ApiResponse(201, result, "Expense added successfully")
    );
  }
);

// Helper function to generate recurring expenses
const generateRecurringExpenses = (baseExpense: any, endDate: Date) => {
  const recurringExpenses = [];
  const { date, recurringPeriod, isRecurring } = baseExpense;
  
  if (!isRecurring || !recurringPeriod) {
    return [];
  }
  
  let currentDate = new Date(date);
  const today = new Date();
  
  // If the base date is in the past, start from the next occurrence after today
  if (currentDate < today) {
    while (currentDate < today) {
      switch (recurringPeriod) {
        case "daily":
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case "weekly":
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case "monthly":
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case "yearly":
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }
  }
  
  // Generate recurring entries up to endDate
  while (currentDate <= endDate) {
    recurringExpenses.push({
      ...baseExpense.toObject(),
      _id: `${baseExpense._id}_${currentDate.getTime()}`,
      date: new Date(currentDate),
      isVirtual: true,
      originalId: baseExpense._id
    });
    
    // Move to next occurrence
    switch (recurringPeriod) {
      case "daily":
        currentDate.setDate(currentDate.getDate() + 1);
        break;
      case "weekly":
        currentDate.setDate(currentDate.getDate() + 7);
        break;
      case "monthly":
        currentDate.setMonth(currentDate.getMonth() + 1);
        break;
      case "yearly":
        currentDate.setFullYear(currentDate.getFullYear() + 1);
        break;
    }
  }
  
  return recurringExpenses;
};

// Get All Expenses (For Logged-in User)
const getAllExpenses = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { page = 1, limit = 10, sortBy = "date", sortOrder = "desc", predictive = "false" } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const sortOrderTyped = sortOrder as 'asc' | 'desc';

    if (pageNum < 1 || limitNum < 1) {
      throw new ApiErrors(400, "Page and limit must be positive numbers");
    }

    const skip = (pageNum - 1) * limitNum;
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    // Build query filter
    const filter: any = { userId: req.user._id };
    
    // If not in predictive mode, filter out future dates
    if (predictive !== "true") {
      filter.date = { $lte: new Date() };
    }

    const expenses = await Expense.find(filter)
      .sort({ [sortBy as string]: sortDirection })
      .select("-__v");

    let allExpenses = [...expenses];
    
    // Generate recurring expenses if in predictive mode
    if (predictive === "true") {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // Show 3 months ahead
      
      const recurringExpenses = await Expense.find({
        userId: req.user._id,
        isRecurring: true
      });
      
      recurringExpenses.forEach(expense => {
        const generated = generateRecurringExpenses(expense, endDate);
        allExpenses.push(...generated);
      });
    }
    
    // Sort all expenses
    allExpenses.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === 1 ? dateA - dateB : dateB - dateA;
    });
    
    // Apply pagination
    const paginatedExpenses = allExpenses.slice(skip, skip + limitNum);
    const totalCount = allExpenses.length;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          expenses: paginatedExpenses,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(totalCount / limitNum),
            totalItems: totalCount,
            itemsPerPage: limitNum,
          },
        },
        "Expenses retrieved successfully"
      )
    );
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

    res.status(200).json(
      new ApiResponse(200, expense, "Expense retrieved successfully")
    );
  }
);

// Update Expense
const updateExpense = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { id } = req.params;
    const { icon, category, amount, date, isRecurring, recurringPeriod } = req.body;

    // Parse date if provided
    const parsedDate = date ? new Date(date) : undefined;

    // Build update object with only provided fields
    const updateData: Partial<IExpense> = {};
    
    if (icon !== undefined) updateData.icon = icon;
    if (category !== undefined) {
      if (!category.trim()) {
        throw new ApiErrors(400, "Category cannot be empty");
      }
      updateData.category = category.trim();
    }
    if (amount !== undefined) {
      if (typeof amount !== "number" || amount <= 0) {
        throw new ApiErrors(400, "Amount must be a positive number");
      }
      updateData.amount = amount;
    }
    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        throw new ApiErrors(400, "Invalid date format");
      }
      updateData.date = parsedDate;
    }
    if (isRecurring !== undefined) {
      updateData.isRecurring = isRecurring;
      if (isRecurring && !recurringPeriod) {
        throw new ApiErrors(400, "Recurring period is required for recurring expenses");
      }
    }
    if (recurringPeriod !== undefined) {
      if (!["daily", "weekly", "monthly", "yearly"].includes(recurringPeriod)) {
        throw new ApiErrors(400, "Invalid recurring period");
      }
      updateData.recurringPeriod = recurringPeriod;
      
      // Recalculate next recurring date if recurring
      if (updateData.isRecurring || (updateData.isRecurring === undefined && isRecurring)) {
        const baseDate = new Date(updateData.date || date);
        switch (recurringPeriod) {
          case "daily":
            updateData.nextRecurringDate = new Date(baseDate.setDate(baseDate.getDate() + 1));
            break;
          case "weekly":
            updateData.nextRecurringDate = new Date(baseDate.setDate(baseDate.getDate() + 7));
            break;
          case "monthly":
            updateData.nextRecurringDate = new Date(baseDate.setMonth(baseDate.getMonth() + 1));
            break;
          case "yearly":
            updateData.nextRecurringDate = new Date(baseDate.setFullYear(baseDate.getFullYear() + 1));
            break;
        }
      }
    }

    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedExpense) {
      throw new ApiErrors(404, "Expense not found");
    }

    res.status(200).json(
      new ApiResponse(200, updatedExpense, "Expense updated successfully")
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

    res.status(200).json(
      new ApiResponse(200, null, "Expense deleted successfully")
    );
  }
);

// Get Expenses by Category
const getExpensesByCategory = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { category } = req.params;

    const expenses = await ExpenseService.getExpensesByCategory(req.user._id, category);

    res.status(200).json(
      new ApiResponse(200, expenses, "Expenses by category retrieved successfully")
    );
  }
);

// Download Expense Details in Excel
const downloadExpenseExcel = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { filepath, filename } = await ExpenseService.generateExpenseExcel(req.user._id);

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

    res.status(200).json(
      new ApiResponse(200, result, "Expense statistics retrieved successfully")
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

    res.status(200).json(
      new ApiResponse(200, trends, "Monthly expense trends retrieved successfully")
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

    // Validation
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      throw new ApiErrors(400, "Description is required for category prediction");
    }

    try {
      // Get prediction from ML service
      const prediction: PredictionResponse = await mlService.predictCategory(description);
      
      // Map to standardized category
      const standardCategory = mlService.mapToStandardCategory(prediction.category);

      const result = {
        originalCategory: prediction.category,
        category: standardCategory,
        confidence: prediction.confidence,
        description: description.trim(),
        isHighConfidence: prediction.confidence >= 0.4,
        suggestFeedback: prediction.confidence < 0.4 || standardCategory === 'Unknown'
      };

      res.status(200).json(
        new ApiResponse(200, result, "Category prediction completed successfully")
      );
    } catch (error) {
      console.error("Prediction error:", error);
      
      // Return fallback response
      const fallbackResult = {
        originalCategory: 'Unknown',
        category: 'Unknown',
        confidence: 0,
        description: description.trim(),
        isHighConfidence: false,
        suggestFeedback: true,
        mlServiceDown: true
      };

      res.status(200).json(
        new ApiResponse(200, fallbackResult, "ML service unavailable, returned fallback prediction")
      );
    }
  }
);

// Send Feedback for Expense Category Prediction
const sendExpenseCategoryFeedback = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { description, category } = req.body;

    // Validation
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      throw new ApiErrors(400, "Description is required for feedback");
    }

    if (!category || typeof category !== "string" || category.trim().length === 0) {
      throw new ApiErrors(400, "Category is required for feedback");
    }

    // Validate category is one of the standard categories
    const standardCategories = [
      'Salary', 'Shopping', 'Education', 'Health', 'Utilities', 
      'Entertainment', 'Transportation', 'Food', 'Unknown'
    ];

    if (!standardCategories.includes(category.trim())) {
      throw new ApiErrors(400, `Category must be one of: ${standardCategories.join(', ')}`);
    }

    try {
      // Send feedback to ML service
      const feedbackResponse: FeedbackResponse = await mlService.sendFeedback(
        description.trim(), 
        category.trim()
      );

      const result = {
        message: feedbackResponse.message,
        description: description.trim(),
        category: category.trim(),
        feedbackCount: feedbackResponse.feedback_count,
        totalClasses: feedbackResponse.total_classes,
        availableClasses: feedbackResponse.classes
      };

      res.status(200).json(
        new ApiResponse(200, result, "Feedback sent successfully")
      );
    } catch (error) {
      console.error("Feedback error:", error);
      
      // Still return success even if ML service is down
      const fallbackResult = {
        message: "Feedback received but ML service unavailable",
        description: description.trim(),
        category: category.trim(),
        mlServiceDown: true
      };

      res.status(200).json(
        new ApiResponse(200, fallbackResult, "Feedback received (ML service unavailable)")
      );
    }
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