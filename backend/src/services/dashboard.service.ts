import Income from "../models/income.models";
import Expense from "../models/expense.models";
import ApiErrors from "../utils/ApiErrors";
import { Types } from "mongoose";
import {
  TransactionWithType,
  CategoryBreakdown,
  MonthlyTrend,
  DashboardResponse,
} from "../types/dashboard.types";

interface DashboardOptions {
  period?: number;
  limit?: number;
}

interface FinancialSummaryOptions {
  startDate?: Date;
  endDate?: Date;
}

interface CashFlowOptions {
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

class DashboardService {
  async getDashboardData(userId: string, options: DashboardOptions = {}): Promise<DashboardResponse> {
    const { period = 30, limit = 5 } = options;
    const userObjectId = new Types.ObjectId(userId);

    // Validate parameters
    if (period < 1 || period > 365) {
      throw new ApiErrors(400, "Period must be between 1 and 365 days");
    }

    if (limit < 1 || limit > 50) {
      throw new ApiErrors(400, "Limit must be between 1 and 50");
    }

    try {
      // Parallel execution for better performance
      const [
        totalIncomeResult,
        totalExpenseResult,
        last30DaysIncome,
        last60DaysIncome,
        recentIncomeTransactions,
        recentExpenseTransactions,
        topExpenseCategories,
        topIncomeSources,
        monthlyTrends,
      ] = await Promise.all([
        // Total income
        Income.aggregate([
          { $match: { userId: userObjectId } },
          { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),

        // Total expenses
        Expense.aggregate([
          { $match: { userId: userObjectId } },
          { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } },
        ]),

        // Last 30 days income
        Income.aggregate([
          {
            $match: {
              userId: userObjectId,
              date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
              count: { $sum: 1 },
              average: { $avg: "$amount" },
            },
          },
        ]),

        // Last 60 days income
        Income.aggregate([
          {
            $match: {
              userId: userObjectId,
              date: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: "$amount" },
              count: { $sum: 1 },
              average: { $avg: "$amount" },
            },
          },
        ]),

        // Recent income transactions
        Income.find({ userId: userObjectId })
          .sort({ date: -1 })
          .limit(limit)
          .select("-__v"),

        // Recent expense transactions
        Expense.find({ userId: userObjectId })
          .sort({ date: -1 })
          .limit(limit)
          .select("-__v"),

        // Top expense categories
        Expense.aggregate([
          { $match: { userId: userObjectId } },
          {
            $group: {
              _id: "$category",
              amount: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { amount: -1 } },
          { $limit: 5 },
        ]),

        // Top income sources
        Income.aggregate([
          { $match: { userId: userObjectId } },
          {
            $group: {
              _id: "$source",
              amount: { $sum: "$amount" },
              count: { $sum: 1 },
            },
          },
          { $sort: { amount: -1 } },
          { $limit: 5 },
        ]),

        // Monthly trends for the last 12 months
        Income.aggregate([
          {
            $match: {
              userId: userObjectId,
              date: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
            },
          },
          {
            $group: {
              _id: {
                year: { $year: "$date" },
                month: { $month: "$date" },
              },
              income: { $sum: "$amount" },
            },
          },
          { $sort: { "_id.year": 1, "_id.month": 1 } },
        ]),
      ]);

      // Get expense trends for the same period
      const expenseMonthlyTrends = await Expense.aggregate([
        {
          $match: {
            userId: userObjectId,
            date: { $gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000) },
          },
        },
        {
          $group: {
            _id: {
              year: { $year: "$date" },
              month: { $month: "$date" },
            },
            expenses: { $sum: "$amount" },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1 } },
      ]);

      // Process data
      const totalIncome = totalIncomeResult[0]?.total || 0;
      const totalExpenses = totalExpenseResult[0]?.total || 0;
      const totalBalance = totalIncome - totalExpenses;
      const savingsRate = totalIncome > 0 ? ((totalBalance / totalIncome) * 100) : 0;

      // Combine and sort recent transactions
      const recentTransactions: TransactionWithType[] = [
        ...recentIncomeTransactions.map((txn) => ({
          _id: txn._id.toString(),
          userId: txn.userId.toString(),
          icon: txn.icon,
          amount: txn.amount,
          date: txn.date,
          createdAt: txn.createdAt,
          updatedAt: txn.updatedAt,
          type: 'income' as const,
          source: txn.source,
        })),
        ...recentExpenseTransactions.map((txn) => ({
          _id: txn._id.toString(),
          userId: txn.userId.toString(),
          icon: txn.icon,
          amount: txn.amount,
          date: txn.date,
          createdAt: txn.createdAt,
          updatedAt: txn.updatedAt,
          type: 'expense' as const,
          category: txn.category,
        })),
      ]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, limit);

      // Calculate category percentages
      const totalExpenseAmount = totalExpenses;
      const totalIncomeAmount = totalIncome;

      const processedExpenseCategories: CategoryBreakdown[] = topExpenseCategories.map((cat) => ({
        name: cat._id,
        amount: cat.amount,
        percentage: totalExpenseAmount > 0 ? (cat.amount / totalExpenseAmount) * 100 : 0,
        count: cat.count,
      }));

      const processedIncomeSources: CategoryBreakdown[] = topIncomeSources.map((source) => ({
        name: source._id,
        amount: source.amount,
        percentage: totalIncomeAmount > 0 ? (source.amount / totalIncomeAmount) * 100 : 0,
        count: source.count,
      }));

      // Combine monthly trends
      const combinedMonthlyTrends: MonthlyTrend[] = [];
      const incomeMap = new Map(
        monthlyTrends.map((item) => [`${item._id.year}-${item._id.month}`, item.income])
      );
      const expenseMap = new Map(
        expenseMonthlyTrends.map((item) => [`${item._id.year}-${item._id.month}`, item.expenses])
      );

      // Create a comprehensive list of months
      const allMonths = new Set([
        ...monthlyTrends.map((item) => `${item._id.year}-${item._id.month}`),
        ...expenseMonthlyTrends.map((item) => `${item._id.year}-${item._id.month}`),
      ]);

      allMonths.forEach((monthKey) => {
        const [year, month] = monthKey.split('-').map(Number);
        const income = incomeMap.get(monthKey) || 0;
        const expenses = expenseMap.get(monthKey) || 0;
        combinedMonthlyTrends.push({
          year,
          month,
          income,
          expenses,
          balance: income - expenses,
        });
      });

      combinedMonthlyTrends.sort((a, b) => {
        if (a.year !== b.year) return a.year - b.year;
        return a.month - b.month;
      });

      // Get last 30 and 60 days transaction details
      const [last30DaysIncomeTransactions, last60DaysIncomeTransactions] = await Promise.all([
        Income.find({
          userId: userObjectId,
          date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        })
          .sort({ date: -1 })
          .select("-__v"),
        
        Income.find({
          userId: userObjectId,
          date: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
        })
          .sort({ date: -1 })
          .select("-__v"),
      ]);

      const dashboardData: DashboardResponse = {
        summary: {
          totalBalance,
          totalIncome,
          totalExpenses,
          savingsRate: Math.round(savingsRate * 100) / 100,
        },
        last30Days: {
          total: last30DaysIncome[0]?.total || 0,
          count: last30DaysIncome[0]?.count || 0,
          average: Math.round((last30DaysIncome[0]?.average || 0) * 100) / 100,
          transactions: last30DaysIncomeTransactions,
        },
        last60Days: {
          total: last60DaysIncome[0]?.total || 0,
          count: last60DaysIncome[0]?.count || 0,
          average: Math.round((last60DaysIncome[0]?.average || 0) * 100) / 100,
          transactions: last60DaysIncomeTransactions,
        },
        recentTransactions,
        topExpenseCategories: processedExpenseCategories,
        topIncomeSource: processedIncomeSources,
        monthlyTrends: combinedMonthlyTrends.slice(-12), // Last 12 months
      };

      return dashboardData;
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      throw new ApiErrors(500, "Failed to fetch dashboard data");
    }
  }

  async getFinancialSummary(userId: string, options: FinancialSummaryOptions = {}): Promise<{
    period: {
      startDate: string;
      endDate: string;
      days: number;
    };
    income: {
      total: number;
      count: number;
      average: number;
      max: number;
      min: number;
    };
    expenses: {
      total: number;
      count: number;
      average: number;
      max: number;
      min: number;
    };
    netIncome: number;
    savingsRate: number;
  }> {
    const userObjectId = new Types.ObjectId(userId);

    // Date range validation and setup
    const start = options.startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const end = options.endDate || new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new ApiErrors(400, "Invalid date format");
    }

    if (start >= end) {
      throw new ApiErrors(400, "Start date must be before end date");
    }

    const dateFilter = { userId: userObjectId, date: { $gte: start, $lte: end } };

    const [incomeStats, expenseStats] = await Promise.all([
      Income.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
            average: { $avg: "$amount" },
            max: { $max: "$amount" },
            min: { $min: "$amount" },
          },
        },
      ]),

      Expense.aggregate([
        { $match: dateFilter },
        {
          $group: {
            _id: null,
            total: { $sum: "$amount" },
            count: { $sum: 1 },
            average: { $avg: "$amount" },
            max: { $max: "$amount" },
            min: { $min: "$amount" },
          },
        },
      ]),
    ]);

    const incomeData = incomeStats[0] || { total: 0, count: 0, average: 0, max: 0, min: 0 };
    const expenseData = expenseStats[0] || { total: 0, count: 0, average: 0, max: 0, min: 0 };

    return {
      period: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
        days: Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)),
      },
      income: incomeData,
      expenses: expenseData,
      netIncome: incomeData.total - expenseData.total,
      savingsRate: incomeData.total > 0 ? ((incomeData.total - expenseData.total) / incomeData.total) * 100 : 0,
    };
  }

  async getCashFlowAnalysis(userId: string, options: CashFlowOptions): Promise<{
    period: string;
    income: any[];
    expenses: any[];
    netFlow: Array<{
      period: any;
      netAmount: number;
      incomeAmount: number;
      expenseAmount: number;
    }>;
  }> {
    const { period } = options;
    const userObjectId = new Types.ObjectId(userId);

    if (!["daily", "weekly", "monthly", "yearly"].includes(period)) {
      throw new ApiErrors(400, "Period must be one of: daily, weekly, monthly, yearly");
    }

    let groupBy: any;
    let dateRange: Date;

    switch (period) {
      case "daily":
        groupBy = {
          year: { $year: "$date" },
          month: { $month: "$date" },
          day: { $dayOfMonth: "$date" },
        };
        dateRange = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
        break;
      case "weekly":
        groupBy = {
          year: { $year: "$date" },
          week: { $week: "$date" },
        };
        dateRange = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // Last 90 days
        break;
      case "monthly":
        groupBy = {
          year: { $year: "$date" },
          month: { $month: "$date" },
        };
        dateRange = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // Last year
        break;
      case "yearly":
        groupBy = { year: { $year: "$date" } };
        dateRange = new Date(Date.now() - 5 * 365 * 24 * 60 * 60 * 1000); // Last 5 years
        break;
      default:
        groupBy = {
          year: { $year: "$date" },
          month: { $month: "$date" },
        };
        dateRange = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000); // Default to last year
        break;
    }

    const [incomeFlow, expenseFlow] = await Promise.all([
      Income.aggregate([
        { $match: { userId: userObjectId, date: { $gte: dateRange } } },
        {
          $group: {
            _id: groupBy,
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1, "_id.day": 1 } },
      ]),

      Expense.aggregate([
        { $match: { userId: userObjectId, date: { $gte: dateRange } } },
        {
          $group: {
            _id: groupBy,
            amount: { $sum: "$amount" },
            count: { $sum: 1 },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.week": 1, "_id.day": 1 } },
      ]),
    ]);

    return {
      period,
      income: incomeFlow,
      expenses: expenseFlow,
      netFlow: incomeFlow.map((income, index) => {
        const expense = expenseFlow[index] || { amount: 0 };
        return {
          period: income._id,
          netAmount: income.amount - expense.amount,
          incomeAmount: income.amount,
          expenseAmount: expense.amount,
        };
      }),
    };
  }

  async getUserFinancialOverview(userId: string): Promise<{
    totalBalance: number;
    totalIncome: number;
    totalExpenses: number;
    savingsRate: number;
    transactionCounts: {
      totalTransactions: number;
      incomeTransactions: number;
      expenseTransactions: number;
    };
  }> {
    const userObjectId = new Types.ObjectId(userId);

    const [incomeStats, expenseStats, incomeCount, expenseCount] = await Promise.all([
      Income.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Expense.aggregate([
        { $match: { userId: userObjectId } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
      Income.countDocuments({ userId: userObjectId }),
      Expense.countDocuments({ userId: userObjectId }),
    ]);

    const totalIncome = incomeStats[0]?.total || 0;
    const totalExpenses = expenseStats[0]?.total || 0;
    const totalBalance = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? ((totalBalance / totalIncome) * 100) : 0;

    return {
      totalBalance,
      totalIncome,
      totalExpenses,
      savingsRate: Math.round(savingsRate * 100) / 100,
      transactionCounts: {
        totalTransactions: incomeCount + expenseCount,
        incomeTransactions: incomeCount,
        expenseTransactions: expenseCount,
      },
    };
  }
}

export default new DashboardService();
export type { DashboardOptions, FinancialSummaryOptions, CashFlowOptions };