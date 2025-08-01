import Income from "../models/income.models";
import type { IIncome } from "../models/income.models";
import ApiErrors from "../utils/ApiErrors";
import AnomalyService from "./anomaly.service";
import type { AnomalyResult } from "../utils/AnomalyDetector";
import { mlService, type PredictionResponse, type FeedbackResponse } from "./mlService";
import * as xlsx from "xlsx";
import * as fs from "fs";
import * as path from "path";

interface IncomeCreationData {
  userId: string;
  icon?: string;
  source: string;
  amount: number;
  date: Date;
  isRecurring?: boolean;
  recurringPeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

interface IncomeUpdateData {
  icon?: string;
  source?: string;
  amount?: number;
  date?: Date;
  isRecurring?: boolean;
  recurringPeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

interface IncomeWithAnomaly {
  income: IIncome;
  anomalyDetection: AnomalyResult;
}

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  predictive?: boolean;
}

interface PaginatedIncomeResult {
  income: (IIncome | VirtualIncomeTransaction)[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

interface IncomeStatsFilter {
  year?: number;
  month?: number;
}

interface IncomeStats {
  totalIncome: number;
  averageIncome: number;
  count: number;
  maxIncome: number;
  minIncome: number;
}

interface VirtualIncomeTransaction {
  _id: string;
  userId: string;
  icon?: string;
  source: string;
  amount: number;
  date: Date;
  isVirtual: boolean;
  originalId: string;
  isRecurring: boolean;
  recurringPeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  createdAt: Date;
  updatedAt: Date;
}

interface IncomeSourcePrediction {
  originalSource: string;
  source: string;
  confidence: number;
  description: string;
  isHighConfidence: boolean;
  suggestFeedback: boolean;
  mlServiceDown?: boolean;
}

interface IncomeSourceFeedbackResult {
  message: string;
  description: string;
  source: string;
  feedbackCount?: number;
  totalClasses?: number;
  availableClasses?: string[];
  mlServiceDown?: boolean;
}

class IncomeService {
  async createIncome(incomeData: IncomeCreationData): Promise<IncomeWithAnomaly> {
    const { userId, icon, source, amount, date, isRecurring, recurringPeriod } = incomeData;

    // Validation
    if ([source, amount, date].some(
      (field) => field === undefined || field === null || field === ""
    )) {
      throw new ApiErrors(400, "Source, amount, and date are required");
    }

    if (typeof amount !== "number" || amount <= 0) {
      throw new ApiErrors(400, "Amount must be a positive number");
    }

    if (isNaN(date.getTime())) {
      throw new ApiErrors(400, "Invalid date format");
    }

    // Validate recurring fields
    if (isRecurring && !recurringPeriod) {
      throw new ApiErrors(400, "Recurring period is required for recurring income");
    }

    if (isRecurring && !["daily", "weekly", "monthly", "yearly"].includes(recurringPeriod!)) {
      throw new ApiErrors(400, "Invalid recurring period");
    }

    // Calculate next recurring date
    let nextRecurringDate: Date | undefined;
    if (isRecurring && recurringPeriod) {
      const baseDate = new Date(date);
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

    // Create income
    const income = await Income.create({
      userId,
      icon: icon || "",
      source: source.trim(),
      amount,
      date,
      isRecurring: isRecurring || false,
      recurringPeriod: isRecurring ? recurringPeriod : undefined,
      nextRecurringDate,
    });

    // Detect anomaly
    let anomalyResult: AnomalyResult;
    try {
      anomalyResult = await AnomalyService.detectAnomaly(
        userId,
        income._id,
        'income',
        source.trim(),
        amount
      );
    } catch (anomalyError) {
      console.error('Anomaly detection failed:', anomalyError);
      // Create a default anomaly result if detection fails
      anomalyResult = {
        isAnomaly: false,
        zScore: 0,
        message: "Anomaly detection unavailable",
        category: source.trim(),
        amount,
        ewmaMean: amount,
        ewmaStandardDeviation: 0,
        transactionCount: 1
      };
    }

    return {
      income,
      anomalyDetection: anomalyResult
    };
  }

  async getAllIncome(userId: string, options: PaginationOptions): Promise<PaginatedIncomeResult> {
    const { page, limit, sortBy, sortOrder, predictive = false } = options;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      throw new ApiErrors(400, "Page and limit must be positive numbers");
    }

    if (limit > 100) {
      throw new ApiErrors(400, "Limit cannot exceed 100");
    }

    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    // Build query filter
    const filter: any = { userId };
    
    // If not in predictive mode, filter out future dates
    if (!predictive) {
      filter.date = { $lte: new Date() };
    }

    const income = await Income.find(filter)
      .sort({ [sortBy]: sortDirection })
      .select("-__v");

    let allIncome: (IIncome | VirtualIncomeTransaction)[] = [...income];
    
    // Generate recurring income if in predictive mode
    if (predictive) {
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // Show 3 months ahead
      
      const recurringIncome = await Income.find({
        userId,
        isRecurring: true
      });
      
      recurringIncome.forEach(income => {
        const generated = this.generateRecurringIncome(income, endDate);
        allIncome.push(...generated);
      });
    }
    
    // Sort all income
    allIncome.sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return sortDirection === 1 ? dateA - dateB : dateB - dateA;
    });
    
    // Apply pagination
    const paginatedIncome = allIncome.slice(skip, skip + limit);
    const totalCount = allIncome.length;

    return {
      income: paginatedIncome,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
      },
    };
  }

  async getIncomeById(userId: string, incomeId: string): Promise<IIncome> {
    if (!incomeId) {
      throw new ApiErrors(400, "Income ID is required");
    }

    const income = await Income.findOne({ _id: incomeId, userId });

    if (!income) {
      throw new ApiErrors(404, "Income not found");
    }

    return income;
  }

  async updateIncome(userId: string, incomeId: string, updateData: IncomeUpdateData): Promise<IIncome> {
    if (!incomeId) {
      throw new ApiErrors(400, "Income ID is required");
    }

    // Build update object with only provided fields
    const updateFields: Partial<IIncome> = {};
    
    if (updateData.icon !== undefined) updateFields.icon = updateData.icon;
    if (updateData.source !== undefined) {
      if (!updateData.source.trim()) {
        throw new ApiErrors(400, "Source cannot be empty");
      }
      updateFields.source = updateData.source.trim();
    }
    if (updateData.amount !== undefined) {
      if (typeof updateData.amount !== "number" || updateData.amount <= 0) {
        throw new ApiErrors(400, "Amount must be a positive number");
      }
      updateFields.amount = updateData.amount;
    }
    if (updateData.date !== undefined) {
      if (isNaN(updateData.date.getTime())) {
        throw new ApiErrors(400, "Invalid date format");
      }
      updateFields.date = updateData.date;
    }
    if (updateData.isRecurring !== undefined) {
      updateFields.isRecurring = updateData.isRecurring;
      if (updateData.isRecurring && !updateData.recurringPeriod) {
        throw new ApiErrors(400, "Recurring period is required for recurring income");
      }
    }
    if (updateData.recurringPeriod !== undefined) {
      if (!["daily", "weekly", "monthly", "yearly"].includes(updateData.recurringPeriod)) {
        throw new ApiErrors(400, "Invalid recurring period");
      }
      updateFields.recurringPeriod = updateData.recurringPeriod;
      
      // Recalculate next recurring date if recurring
      if (updateFields.isRecurring || (updateFields.isRecurring === undefined && updateData.isRecurring)) {
        const baseDate = new Date(updateFields.date || updateData.date!);
        switch (updateData.recurringPeriod) {
          case "daily":
            updateFields.nextRecurringDate = new Date(baseDate.setDate(baseDate.getDate() + 1));
            break;
          case "weekly":
            updateFields.nextRecurringDate = new Date(baseDate.setDate(baseDate.getDate() + 7));
            break;
          case "monthly":
            updateFields.nextRecurringDate = new Date(baseDate.setMonth(baseDate.getMonth() + 1));
            break;
          case "yearly":
            updateFields.nextRecurringDate = new Date(baseDate.setFullYear(baseDate.getFullYear() + 1));
            break;
        }
      }
    }

    const updatedIncome = await Income.findOneAndUpdate(
      { _id: incomeId, userId },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedIncome) {
      throw new ApiErrors(404, "Income not found");
    }

    return updatedIncome;
  }

  async deleteIncome(userId: string, incomeId: string): Promise<void> {
    if (!incomeId) {
      throw new ApiErrors(400, "Income ID is required");
    }

    const deletedIncome = await Income.findOneAndDelete({
      _id: incomeId,
      userId,
    });

    if (!deletedIncome) {
      throw new ApiErrors(404, "Income not found");
    }
  }

  async generateIncomeExcel(userId: string): Promise<{ filepath: string; filename: string }> {
    const income = await Income.find({ userId })
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

    // Generate filename and filepath
    const filename = `income_details_${new Date().toISOString().split("T")[0]}.xlsx`;
    const filepath = path.join(process.cwd(), "temp", filename);

    // Ensure temp directory exists
    const tempDir = path.join(process.cwd(), "temp");
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Write file
    xlsx.writeFile(wb, filepath);

    return { filepath, filename };
  }

  async getIncomeStats(userId: string, filter: IncomeStatsFilter = {}): Promise<IncomeStats> {
    const { year, month } = filter;

    // Build date filter
    const dateFilter: any = {};
    if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);
      dateFilter.date = { $gte: startDate, $lt: endDate };
    }
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      dateFilter.date = { $gte: startDate, $lt: endDate };
    }

    const stats = await Income.aggregate([
      { $match: { userId, ...dateFilter } },
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

    return stats.length > 0 ? stats[0] : {
      totalIncome: 0,
      averageIncome: 0,
      count: 0,
      maxIncome: 0,
      minIncome: 0,
    };
  }

  async getTotalIncomeAmount(userId: string): Promise<number> {
    const result = await Income.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  async getIncomeCountByUser(userId: string): Promise<number> {
    return await Income.countDocuments({ userId });
  }

  async getTopIncomeSources(userId: string, limit: number = 5): Promise<Array<{
    source: string;
    totalAmount: number;
    count: number;
    percentage?: number;
  }>> {
    const sources = await Income.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: "$source",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          source: "$_id",
          totalAmount: 1,
          count: 1,
        },
      },
    ]);

    return sources;
  }

  async getRecentIncomeTransactions(userId: string, limit: number = 5): Promise<IIncome[]> {
    return await Income.find({ userId })
      .sort({ date: -1 })
      .limit(limit)
      .select("-__v");
  }

  async getIncomeByDateRange(
    userId: string, 
    startDate: Date, 
    endDate: Date
  ): Promise<{
    total: number;
    count: number;
    average: number;
    transactions: IIncome[];
  }> {
    const dateFilter = { userId, date: { $gte: startDate, $lte: endDate } };

    const [stats, transactions] = await Promise.all([
      Income.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
            average: { $avg: "$amount" },
          },
        },
      ]),
      Income.find(dateFilter)
        .sort({ date: -1 })
        .select("-__v")
    ]);

    const statsResult = stats.length > 0 ? stats[0] : { total: 0, count: 0, average: 0 };

    return {
      ...statsResult,
      transactions,
    };
  }

  async getMonthlyIncomeAggregation(userId: string, year: number): Promise<Array<{
    month: number;
    year: number;
    totalAmount: number;
    count: number;
  }>> {
    return await Income.aggregate([
      {
        $match: {
          userId,
          date: {
            $gte: new Date(year, 0, 1),
            $lt: new Date(year + 1, 0, 1),
          },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
          },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          year: "$_id.year",
          month: "$_id.month",
          totalAmount: 1,
          count: 1,
        },
      },
      { $sort: { month: 1 } },
    ]);
  }

  async deleteAllIncomeByUser(userId: string): Promise<void> {
    await Income.deleteMany({ userId });
  }

  // Helper function to generate recurring income
  private generateRecurringIncome(baseIncome: any, endDate: Date): VirtualIncomeTransaction[] {
    const recurringIncome: VirtualIncomeTransaction[] = [];
    const { date, recurringPeriod, isRecurring } = baseIncome;
    
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
      const virtualTransaction: VirtualIncomeTransaction = {
        _id: `${baseIncome._id}_${currentDate.getTime()}`,
        userId: baseIncome.userId,
        icon: baseIncome.icon,
        source: baseIncome.source,
        amount: baseIncome.amount,
        date: new Date(currentDate),
        isVirtual: true,
        originalId: baseIncome._id,
        isRecurring: baseIncome.isRecurring,
        recurringPeriod: baseIncome.recurringPeriod,
        createdAt: baseIncome.createdAt,
        updatedAt: baseIncome.updatedAt
      };
      
      recurringIncome.push(virtualTransaction);
      
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
  }

  // Predict Income Source using ML
  async predictIncomeSource(description: string): Promise<IncomeSourcePrediction> {
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

      return {
        originalSource: prediction.category,
        source: sourceCategory,
        confidence: prediction.confidence,
        description: description.trim(),
        isHighConfidence: prediction.confidence >= 0.4,
        suggestFeedback: prediction.confidence < 0.4 || sourceCategory === 'Unknown'
      };
    } catch (error) {
      console.error("Income prediction error:", error);
      
      // Return fallback response
      return {
        originalSource: 'Unknown',
        source: 'Salary',
        confidence: 0,
        description: description.trim(),
        isHighConfidence: false,
        suggestFeedback: true,
        mlServiceDown: true
      };
    }
  }

  // Send Feedback for Income Source Prediction
  async sendIncomeSourceFeedback(description: string, source: string): Promise<IncomeSourceFeedbackResult> {
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

      return {
        message: feedbackResponse.message,
        description: description.trim(),
        source: providedSource,
        feedbackCount: feedbackResponse.feedback_count,
        totalClasses: feedbackResponse.total_classes,
        availableClasses: feedbackResponse.classes
      };
    } catch (error) {
      console.error("Income feedback error:", error);
      
      // Still return success even if ML service is down
      return {
        message: "Feedback received but ML service unavailable",
        description: description.trim(),
        source: providedSource,
        mlServiceDown: true
      };
    }
  }
}

export default new IncomeService();
export type { 
  IncomeCreationData, 
  IncomeUpdateData, 
  IncomeWithAnomaly, 
  PaginationOptions, 
  PaginatedIncomeResult,
  IncomeStatsFilter,
  IncomeStats,
  VirtualIncomeTransaction,
  IncomeSourcePrediction,
  IncomeSourceFeedbackResult
};