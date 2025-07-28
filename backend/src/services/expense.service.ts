import Expense from "../models/expense.models";
import type { IExpense } from "../models/expense.models";
import ApiErrors from "../utils/ApiErrors";
import AnomalyService from "./anomaly.service";
import type { AnomalyResult } from "../utils/AnomalyDetector";
import * as xlsx from "xlsx";
import * as fs from "fs";
import * as path from "path";

interface ExpenseCreationData {
  userId: string;
  icon?: string;
  category: string;
  amount: number;
  date: Date;
}

interface ExpenseUpdateData {
  icon?: string;
  category?: string;
  amount?: number;
  date?: Date;
}

interface ExpenseWithAnomaly {
  expense: IExpense;
  anomalyDetection: AnomalyResult;
}

interface PaginationOptions {
  page: number;
  limit: number;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

interface PaginatedExpenseResult {
  expenses: IExpense[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

interface ExpenseStatsFilter {
  year?: number;
  month?: number;
  category?: string;
}

interface ExpenseStats {
  overall: {
    totalExpense: number;
    averageExpense: number;
    count: number;
    maxExpense: number;
    minExpense: number;
  };
  byCategory: Array<{
    _id: string;
    totalAmount: number;
    count: number;
    averageAmount: number;
  }>;
}

class ExpenseService {
  async createExpense(expenseData: ExpenseCreationData): Promise<ExpenseWithAnomaly> {
    const { userId, icon, category, amount, date } = expenseData;

    // Validation
    if ([category, amount, date].some(
      (field) => field === undefined || field === null || field === ""
    )) {
      throw new ApiErrors(400, "Category, amount, and date are required");
    }

    if (typeof amount !== "number" || amount <= 0) {
      throw new ApiErrors(400, "Amount must be a positive number");
    }

    if (isNaN(date.getTime())) {
      throw new ApiErrors(400, "Invalid date format");
    }

    // Create expense
    const expense = await Expense.create({
      userId,
      icon: icon || "",
      category: category.trim(),
      amount,
      date,
    });

    // Detect anomaly
    let anomalyResult: AnomalyResult;
    try {
      anomalyResult = await AnomalyService.detectAnomaly(
        userId,
        expense._id,
        'expense',
        category.trim(),
        amount
      );
    } catch (anomalyError) {
      console.error('Anomaly detection failed:', anomalyError);
      // Create a default anomaly result if detection fails
      anomalyResult = {
        isAnomaly: false,
        zScore: 0,
        message: "Anomaly detection unavailable",
        category: category.trim(),
        amount,
        ewmaMean: amount,
        ewmaStandardDeviation: 0,
        transactionCount: 1
      };
    }

    return {
      expense,
      anomalyDetection: anomalyResult
    };
  }

  async getAllExpenses(userId: string, options: PaginationOptions): Promise<PaginatedExpenseResult> {
    const { page, limit, sortBy, sortOrder } = options;

    // Validate pagination parameters
    if (page < 1 || limit < 1) {
      throw new ApiErrors(400, "Page and limit must be positive numbers");
    }

    if (limit > 100) {
      throw new ApiErrors(400, "Limit cannot exceed 100");
    }

    const skip = (page - 1) * limit;
    const sortDirection = sortOrder === "asc" ? 1 : -1;

    const [expenses, totalCount] = await Promise.all([
      Expense.find({ userId })
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .select("-__v"),
      Expense.countDocuments({ userId })
    ]);

    return {
      expenses,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
      },
    };
  }

  async getExpenseById(userId: string, expenseId: string): Promise<IExpense> {
    if (!expenseId) {
      throw new ApiErrors(400, "Expense ID is required");
    }

    const expense = await Expense.findOne({ _id: expenseId, userId });

    if (!expense) {
      throw new ApiErrors(404, "Expense not found");
    }

    return expense;
  }

  async updateExpense(userId: string, expenseId: string, updateData: ExpenseUpdateData): Promise<IExpense> {
    if (!expenseId) {
      throw new ApiErrors(400, "Expense ID is required");
    }

    // Build update object with only provided fields
    const updateFields: Partial<IExpense> = {};
    
    if (updateData.icon !== undefined) updateFields.icon = updateData.icon;
    if (updateData.category !== undefined) {
      if (!updateData.category.trim()) {
        throw new ApiErrors(400, "Category cannot be empty");
      }
      updateFields.category = updateData.category.trim();
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

    const updatedExpense = await Expense.findOneAndUpdate(
      { _id: expenseId, userId },
      updateFields,
      { new: true, runValidators: true }
    );

    if (!updatedExpense) {
      throw new ApiErrors(404, "Expense not found");
    }

    return updatedExpense;
  }

  async deleteExpense(userId: string, expenseId: string): Promise<void> {
    if (!expenseId) {
      throw new ApiErrors(400, "Expense ID is required");
    }

    const deletedExpense = await Expense.findOneAndDelete({
      _id: expenseId,
      userId,
    });

    if (!deletedExpense) {
      throw new ApiErrors(404, "Expense not found");
    }
  }

  async getExpensesByCategory(userId: string, category: string): Promise<IExpense[]> {
    if (!category) {
      throw new ApiErrors(400, "Category is required");
    }

    const expenses = await Expense.find({ 
      userId, 
      category: { $regex: new RegExp(category, "i") } 
    })
      .sort({ date: -1 })
      .select("-__v");

    return expenses;
  }

  async generateExpenseExcel(userId: string): Promise<{ filepath: string; filename: string }> {
    const expenses = await Expense.find({ userId })
      .sort({ date: -1 })
      .select("-__v -userId");

    if (!expenses.length) {
      throw new ApiErrors(404, "No expense records found");
    }

    // Prepare data for Excel
    const data = expenses.map((item) => ({
      Category: item.category,
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

    xlsx.utils.book_append_sheet(wb, ws, "Expense Records");

    // Generate filename and filepath
    const filename = `expense_details_${new Date().toISOString().split("T")[0]}.xlsx`;
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

  async getExpenseStats(userId: string, filter: ExpenseStatsFilter = {}): Promise<ExpenseStats> {
    const { year, month, category } = filter;

    // Build date filter
    const matchFilter: any = { userId };
    
    if (year) {
      const startDate = new Date(year, 0, 1);
      const endDate = new Date(year + 1, 0, 1);
      matchFilter.date = { $gte: startDate, $lt: endDate };
    }
    if (month && year) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 1);
      matchFilter.date = { $gte: startDate, $lt: endDate };
    }
    if (category) {
      matchFilter.category = { $regex: new RegExp(category, "i") };
    }

    const [stats, categoryStats] = await Promise.all([
      Expense.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: null,
            totalExpense: { $sum: "$amount" },
            averageExpense: { $avg: "$amount" },
            count: { $sum: 1 },
            maxExpense: { $max: "$amount" },
            minExpense: { $min: "$amount" },
          },
        },
      ]),
      Expense.aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: "$category",
            totalAmount: { $sum: "$amount" },
            count: { $sum: 1 },
            averageAmount: { $avg: "$amount" },
          },
        },
        { $sort: { totalAmount: -1 } },
      ])
    ]);

    return {
      overall: stats.length > 0 ? stats[0] : {
        totalExpense: 0,
        averageExpense: 0,
        count: 0,
        maxExpense: 0,
        minExpense: 0,
      },
      byCategory: categoryStats,
    };
  }

  async getMonthlyExpenseTrends(userId: string, year: number = new Date().getFullYear()): Promise<Array<{
    month: number;
    totalAmount: number;
    count: number;
    averageAmount: number;
  }>> {
    const trends = await Expense.aggregate([
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
          _id: { $month: "$date" },
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
          averageAmount: { $avg: "$amount" },
        },
      },
      {
        $project: {
          _id: 0,
          month: "$_id",
          totalAmount: 1,
          count: 1,
          averageAmount: 1,
        },
      },
      { $sort: { month: 1 } },
    ]);

    return trends;
  }

  async getTotalExpenseAmount(userId: string): Promise<number> {
    const result = await Expense.aggregate([
      { $match: { userId } },
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    return result.length > 0 ? result[0].total : 0;
  }

  async getExpenseCountByUser(userId: string): Promise<number> {
    return await Expense.countDocuments({ userId });
  }

  async getTopExpenseCategories(userId: string, limit: number = 5): Promise<Array<{
    category: string;
    totalAmount: number;
    count: number;
    percentage?: number;
  }>> {
    const categories = await Expense.aggregate([
      { $match: { userId } },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { totalAmount: -1 } },
      { $limit: limit },
      {
        $project: {
          _id: 0,
          category: "$_id",
          totalAmount: 1,
          count: 1,
        },
      },
    ]);

    return categories;
  }

  async deleteAllExpensesByUser(userId: string): Promise<void> {
    await Expense.deleteMany({ userId });
  }
}

export default new ExpenseService();
export type { 
  ExpenseCreationData, 
  ExpenseUpdateData, 
  ExpenseWithAnomaly, 
  PaginationOptions, 
  PaginatedExpenseResult,
  ExpenseStatsFilter,
  ExpenseStats
};