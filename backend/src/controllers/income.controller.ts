import { Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiErrors from "../utils/ApiErrors";
import ApiResponse from "../utils/ApiResponse";
import Income from "../models/income.models";
import type { IIncome } from "../models/income.models";
import { AuthenticatedRequest } from "../types/common.types";
import { mlService, type PredictionResponse, type FeedbackResponse } from "../services/mlService";
import * as xlsx from "xlsx";
import * as fs from "fs";
import * as path from "path";

// Add Income
const addIncome = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { icon, source, amount, date, isRecurring, recurringPeriod } = req.body;

    // Validation: Check for missing fields
    if (
      [source, amount, date].some(
        (field) => field === undefined || field === null || field === ""
      )
    ) {
      throw new ApiErrors(400, "Source, amount, and date are required");
    }

    // Validate amount is a positive number
    if (typeof amount !== "number" || amount <= 0) {
      throw new ApiErrors(400, "Amount must be a positive number");
    }

    // Validate date
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new ApiErrors(400, "Invalid date format");
    }

    // Validate recurring fields
    if (isRecurring && !recurringPeriod) {
      throw new ApiErrors(400, "Recurring period is required for recurring income");
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

    const newIncome = await Income.create({
      userId: req.user._id,
      icon: icon || "",
      source: source.trim(),
      amount,
      date: parsedDate,
      isRecurring: isRecurring || false,
      recurringPeriod: isRecurring ? recurringPeriod : undefined,
      nextRecurringDate,
    });

    res.status(201).json(
      new ApiResponse(201, newIncome, "Income added successfully")
    );
  }
);

// Helper function to generate recurring income (up to today only)
const generateRecurringIncome = (baseIncome: any) => {
  const recurringIncome = [];
  const { date, recurringPeriod, isRecurring } = baseIncome;
  
  if (!isRecurring || !recurringPeriod) {
    return [];
  }
  
  let currentDate = new Date(date);
  const today = new Date();
  
  // Generate recurring entries up to today only
  while (currentDate <= today) {
    // Skip the original transaction date (it's already in the database)
    if (currentDate.getTime() !== new Date(date).getTime()) {
      recurringIncome.push({
        ...baseIncome.toObject(),
        _id: `${baseIncome._id}_${currentDate.getTime()}`,
        date: new Date(currentDate),
        isVirtual: true,
        originalId: baseIncome._id
      });
    }
    
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
  
  return recurringIncome;
};

// Get All Income (For Logged-in User)
const getAllIncome = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { page = 1, limit = 10, sortBy = "date", sortOrder = "desc" } = req.query;

    // Validate pagination parameters
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);

    if (pageNum < 1 || limitNum < 1) {
      throw new ApiErrors(400, "Page and limit must be positive numbers");
    }

    const skip = (pageNum - 1) * limitNum;
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    // Build query filter (only show income up to today)
    const filter: any = { userId: req.user._id, date: { $lte: new Date() } };

    const income = await Income.find(filter)
      .sort({ [sortBy as string]: sortDirection })
      .select("-__v");

    let allIncome = [...income];
    
    // Always generate recurring income up to today
    const recurringIncome = await Income.find({
      userId: req.user._id,
      isRecurring: true
    });
    
    recurringIncome.forEach(income => {
      const generated = generateRecurringIncome(income);
      allIncome.push(...generated);
    });
    
    // Filter out future dates and sort all income
    allIncome = allIncome.filter(income => new Date(income.date) <= new Date());
    allIncome.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === 1 ? dateA - dateB : dateB - dateA;
    });
    
    // Apply pagination
    const paginatedIncome = allIncome.slice(skip, skip + limitNum);
    const totalCount = allIncome.length;

    res.status(200).json(
      new ApiResponse(
        200,
        {
          income: paginatedIncome,
          pagination: {
            currentPage: pageNum,
            totalPages: Math.ceil(totalCount / limitNum),
            totalItems: totalCount,
            itemsPerPage: limitNum,
          },
        },
        "Income retrieved successfully"
      )
    );
  }
);

// Get Income by ID
const getIncomeById = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { id } = req.params;

    if (!id) {
      throw new ApiErrors(400, "Income ID is required");
    }

    const income = await Income.findOne({ _id: id, userId: req.user._id });

    if (!income) {
      throw new ApiErrors(404, "Income not found");
    }

    res.status(200).json(
      new ApiResponse(200, income, "Income retrieved successfully")
    );
  }
);

// Update Income
const updateIncome = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { id } = req.params;
    const { icon, source, amount, date, isRecurring, recurringPeriod } = req.body;

    if (!id) {
      throw new ApiErrors(400, "Income ID is required");
    }

    // Build update object with only provided fields
    const updateData: Partial<IIncome> = {};
    
    if (icon !== undefined) updateData.icon = icon;
    if (source !== undefined) {
      if (!source.trim()) {
        throw new ApiErrors(400, "Source cannot be empty");
      }
      updateData.source = source.trim();
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
        throw new ApiErrors(400, "Recurring period is required for recurring income");
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

    const updatedIncome = await Income.findOneAndUpdate(
      { _id: id, userId: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedIncome) {
      throw new ApiErrors(404, "Income not found");
    }

    res.status(200).json(
      new ApiResponse(200, updatedIncome, "Income updated successfully")
    );
  }
);

// Delete Income
const deleteIncome = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { id } = req.params;

    if (!id) {
      throw new ApiErrors(400, "Income ID is required");
    }

    const deletedIncome = await Income.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!deletedIncome) {
      throw new ApiErrors(404, "Income not found");
    }

    res.status(200).json(
      new ApiResponse(200, null, "Income deleted successfully")
    );
  }
);

// Download Income Details in Excel
const downloadIncomeExcel = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const income = await Income.find({ userId: req.user._id })
      .sort({ date: -1 })
      .select("-__v -userId");

    if (!income.length) {
      throw new ApiErrors(404, "No income records found");
    }

    // Prepare data for Excel
    const data = income.map((item) => ({
      Source: item.source,
      Amount: item.amount,
      Date: item.date.toISOString().split("T")[0], // Format date as YYYY-MM-DD
      Icon: item.icon || "",
      "Created At": item.createdAt.toISOString().split("T")[0],
    }));

    // Create workbook and worksheet
    const wb = xlsx.utils.book_new();
    const ws = xlsx.utils.json_to_sheet(data);

    // Add some styling and formatting
    const range = xlsx.utils.decode_range(ws["!ref"] || "A1");
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const address = xlsx.utils.encode_col(C) + "1";
      if (!ws[address]) continue;
      ws[address].s = { font: { bold: true } };
    }

    xlsx.utils.book_append_sheet(wb, ws, "Income Records");

    // Generate filename with timestamp
    const filename = `income_details_${new Date().toISOString().split("T")[0]}.xlsx`;
    const filepath = path.join(process.cwd(), "temp", filename);

    // Ensure temp directory exists
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write file
    xlsx.writeFile(wb, filepath);

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

    // Build date filter
    const dateFilter: any = {};
    if (year) {
      const startDate = new Date(parseInt(year as string), 0, 1);
      const endDate = new Date(parseInt(year as string) + 1, 0, 1);
      dateFilter.date = { $gte: startDate, $lt: endDate };
    }
    if (month && year) {
      const startDate = new Date(parseInt(year as string), parseInt(month as string) - 1, 1);
      const endDate = new Date(parseInt(year as string), parseInt(month as string), 1);
      dateFilter.date = { $gte: startDate, $lt: endDate };
    }

    const stats = await Income.aggregate([
      { $match: { userId: req.user._id, ...dateFilter } },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: "$amount" },
          averageIncome: { $avg: "$amount" },
          count: { $sum: 1 },
          maxIncome: { $max: "$amount" },
          minIncome: { $min: "$amount" },
        },
      },
    ]);

    const result = stats.length > 0 ? stats[0] : {
      totalIncome: 0,
      averageIncome: 0,
      count: 0,
      maxIncome: 0,
      minIncome: 0,
    };

    res.status(200).json(
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

    // Validation
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      throw new ApiErrors(400, "Description is required for source prediction");
    }

    try {
      // Get prediction from ML service
      const prediction: PredictionResponse = await mlService.predictCategory(description);
      
      // Map to income-relevant categories (treat as source)
      let sourceCategory = prediction.category;
      
      // Map some expense categories to income sources
      const incomeSourceMappings: Record<string, string> = {
        'Food': 'Salary',
        'Shopping': 'Salary', 
        'Transportation': 'Salary',
        'Health': 'Salary',
        'Education': 'Salary',
        'Utilities': 'Salary',
        'Entertainment': 'Salary',
        'Salary': 'Salary',
        'Unknown': 'Unknown'
      };

      sourceCategory = incomeSourceMappings[prediction.category] || 'Salary';

      const result = {
        originalSource: prediction.category,
        source: sourceCategory,
        confidence: prediction.confidence,
        description: description.trim(),
        isHighConfidence: prediction.confidence >= 0.4,
        suggestFeedback: prediction.confidence < 0.4 || sourceCategory === 'Unknown'
      };

      res.status(200).json(
        new ApiResponse(200, result, "Income source prediction completed successfully")
      );
    } catch (error) {
      console.error("Income prediction error:", error);
      
      // Return fallback response
      const fallbackResult = {
        originalSource: 'Unknown',
        source: 'Salary',
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

// Send Feedback for Income Source Prediction
const sendIncomeSourceFeedback = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { description, source } = req.body;

    // Validation
    if (!description || typeof description !== "string" || description.trim().length === 0) {
      throw new ApiErrors(400, "Description is required for feedback");
    }

    if (!source || typeof source !== "string" || source.trim().length === 0) {
      throw new ApiErrors(400, "Source is required for feedback");
    }

    // Validate source is reasonable for income
    const commonIncomeSources = [
      'Salary', 'Freelance', 'Business', 'Investment', 'Rental', 
      'Part-time', 'Commission', 'Bonus', 'Unknown'
    ];

    const providedSource = source.trim();
    // Allow any source, but log if it's not in common list
    if (!commonIncomeSources.includes(providedSource)) {
      console.log(`New income source provided: ${providedSource}`);
    }

    try {
      // Send feedback to ML service (treat income source as category for ML training)
      const feedbackResponse: FeedbackResponse = await mlService.sendFeedback(
        description.trim(), 
        providedSource
      );

      const result = {
        message: feedbackResponse.message,
        description: description.trim(),
        source: providedSource,
        feedbackCount: feedbackResponse.feedback_count,
        totalClasses: feedbackResponse.total_classes,
        availableClasses: feedbackResponse.classes
      };

      res.status(200).json(
        new ApiResponse(200, result, "Income source feedback sent successfully")
      );
    } catch (error) {
      console.error("Income feedback error:", error);
      
      // Still return success even if ML service is down
      const fallbackResult = {
        message: "Feedback received but ML service unavailable",
        description: description.trim(),
        source: providedSource,
        mlServiceDown: true
      };

      res.status(200).json(
        new ApiResponse(200, fallbackResult, "Feedback received (ML service unavailable)")
      );
    }
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