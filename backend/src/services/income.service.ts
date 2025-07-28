import Income from "../models/income.models";
import type { IIncome } from "../models/income.models";
import ApiErrors from "../utils/ApiErrors";
import AnomalyService from "./anomaly.service";
import type { AnomalyResult } from "../utils/AnomalyDetector";
import * as xlsx from "xlsx";
import * as fs from "fs";
import * as path from "path";

interface IncomeCreationData {
  userId: string;
  icon?: string;
  source: string;
  amount: number;
  date: Date;
}

interface IncomeUpdateData {
  icon?: string;
  source?: string;
  amount?: number;
  date?: Date;
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
}

interface PaginatedIncomeResult {
  income: IIncome[];
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

class IncomeService {
  async createIncome(incomeData: IncomeCreationData): Promise<IncomeWithAnomaly> {
    const { userId, icon, source, amount, date } = incomeData;

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

    // Create income
    const income = await Income.create({
      userId,
      icon: icon || "",
      source: source.trim(),
      amount,
      date,
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

    const [income, totalCount] = await Promise.all([
      Income.find({ userId })
        .sort({ [sortBy]: sortDirection })
        .skip(skip)
        .limit(limit)
        .select("-__v"),
      Income.countDocuments({ userId })
    ]);

    return {
      income,
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
}

export default new IncomeService();
export type { 
  IncomeCreationData, 
  IncomeUpdateData, 
  IncomeWithAnomaly, 
  PaginationOptions, 
  PaginatedIncomeResult,
  IncomeStatsFilter,
  IncomeStats
};