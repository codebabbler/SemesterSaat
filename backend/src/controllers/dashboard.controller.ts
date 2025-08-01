import { Response } from "express";
import asyncHandler from "../utils/asyncHandler";
import ApiErrors from "../utils/ApiErrors";
import ApiResponse from "../utils/ApiResponse";
import { AuthenticatedRequest } from "../types/common.types";
import DashboardService from "../services/dashboard.service";

// Helper function to generate recurring transactions for dashboard
const generateRecurringTransactions = (transactions: any[], endDate: Date, type: 'income' | 'expense'): any[] => {
  const recurringTransactions: any[] = [];
  
  transactions.forEach(transaction => {
    const { date, recurringPeriod, isRecurring } = transaction;
    
    if (!isRecurring || !recurringPeriod) {
      return;
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
      const recurringTransaction = {
        ...transaction.toObject(),
        _id: `${transaction._id}_${currentDate.getTime()}`,
        date: new Date(currentDate),
        isVirtual: true,
        originalId: transaction._id
      };
      
      recurringTransactions.push(recurringTransaction);
      
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
  });
  
  return recurringTransactions;
};

// Get Dashboard Data
const getDashboardData = asyncHandler(
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const { period = 30, limit = 5, predictive = "false" } = req.query;
    const userId = new Types.ObjectId(req.user._id);
    
    // Date filter for current vs predictive mode
    const currentDate = new Date();
    const dateFilter = predictive === "true" ? {} : { date: { $lte: currentDate } };

    const periodDays = parseInt(period as string);
    const limitNum = parseInt(limit as string);

    const dashboardData = await DashboardService.getDashboardData(req.user._id, {
      period: periodDays,
      limit: limitNum,
    });

    if (limitNum < 1 || limitNum > 50) {
      throw new ApiErrors(400, "Limit must be between 1 and 50");
    }

    try {
      // Get recurring transactions for predictive mode
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 3); // Show 3 months ahead
      
      // Get all income and expense transactions
      const [allIncome, allExpenses, recurringIncome, recurringExpenses] = await Promise.all([
        Income.find({ userId }),
        Expense.find({ userId }),
        Income.find({ userId, isRecurring: true }),
        Expense.find({ userId, isRecurring: true })
      ]);
      
      // Generate recurring transactions for predictive mode
      const futureIncomeTransactions = predictive === "true" ? generateRecurringTransactions(recurringIncome, endDate, 'income') : [];
      const futureExpenseTransactions = predictive === "true" ? generateRecurringTransactions(recurringExpenses, endDate, 'expense') : [];
      
      // Combine all transactions
      const allIncomeTransactions = predictive === "true" ? [...allIncome, ...futureIncomeTransactions] : allIncome;
      const allExpenseTransactions = predictive === "true" ? [...allExpenses, ...futureExpenseTransactions] : allExpenses;
      
      // Apply date filters for non-predictive mode
      const filteredIncomeTransactions = predictive === "true" ? allIncomeTransactions : allIncomeTransactions.filter(t => new Date(t.date) <= new Date());
      const filteredExpenseTransactions = predictive === "true" ? allExpenseTransactions : allExpenseTransactions.filter(t => new Date(t.date) <= new Date());
      
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
        Promise.resolve([{ 
          total: filteredIncomeTransactions.reduce((sum: number, t: any) => sum + t.amount, 0), 
          count: filteredIncomeTransactions.length 
        }]),

        // Total expenses
        Promise.resolve([{ 
          total: filteredExpenseTransactions.reduce((sum: number, t: any) => sum + t.amount, 0), 
          count: filteredExpenseTransactions.length 
        }]),

        // Last 30 days income
        Promise.resolve([{
          total: allIncomeTransactions
            .filter((t: any) => new Date(t.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            .reduce((sum: number, t: any) => sum + t.amount, 0),
          count: allIncomeTransactions
            .filter((t: any) => new Date(t.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            .length,
          average: allIncomeTransactions
            .filter((t: any) => new Date(t.date) >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
            .reduce((sum: number, t: any, _, arr: any[]) => sum + t.amount / arr.length, 0)
        }]),

        // Last 60 days income
        Promise.resolve([{
          total: allIncomeTransactions
            .filter((t: any) => new Date(t.date) >= new Date(Date.now() - 60 * 24 * 60 * 60 * 1000))
            .reduce((sum: number, t: any) => sum + t.amount, 0),
          count: allIncomeTransactions
            .filter((t: any) => new Date(t.date) >= new Date(Date.now() - 60 * 24 * 60 * 60 * 1000))
            .length,
          average: allIncomeTransactions
            .filter((t: any) => new Date(t.date) >= new Date(Date.now() - 60 * 24 * 60 * 60 * 1000))
            .reduce((sum: number, t: any, _, arr: any[]) => sum + t.amount / arr.length, 0)
        }]),

        // Recent income transactions
        Promise.resolve(
          filteredIncomeTransactions
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, limitNum)
        ),

        // Recent expense transactions
        Promise.resolve(
          filteredExpenseTransactions
            .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, limitNum)
        ),

        // Top expense categories
        Promise.resolve((() => {
          const categoryTotals: Record<string, { amount: number; count: number }> = {};
          filteredExpenseTransactions.forEach((expense: any) => {
            const category = expense.category || 'Unknown';
            if (categoryTotals[category]) {
              categoryTotals[category].amount += expense.amount;
              categoryTotals[category].count += 1;
            } else {
              categoryTotals[category] = { amount: expense.amount, count: 1 };
            }
          });
          return Object.entries(categoryTotals)
            .map(([category, data]) => ({ _id: category, ...data }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
        })()),

        // Top income sources
        Promise.resolve((() => {
          const sourceTotals: Record<string, { amount: number; count: number }> = {};
          filteredIncomeTransactions.forEach((income: any) => {
            const source = income.source || 'Unknown';
            if (sourceTotals[source]) {
              sourceTotals[source].amount += income.amount;
              sourceTotals[source].count += 1;
            } else {
              sourceTotals[source] = { amount: income.amount, count: 1 };
            }
          });
          return Object.entries(sourceTotals)
            .map(([source, data]) => ({ _id: source, ...data }))
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5);
        })()),

        // Monthly trends for the last 12 months
        Promise.resolve((() => {
          const monthlyTotals: Record<string, number> = {};
          const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
          allIncomeTransactions
            .filter((income: any) => new Date(income.date) >= cutoffDate)
            .forEach((income: any) => {
              const date = new Date(income.date);
              const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
              monthlyTotals[key] = (monthlyTotals[key] || 0) + income.amount;
            });
          return Object.entries(monthlyTotals)
            .map(([key, income]) => {
              const [year, month] = key.split('-').map(Number);
              return { _id: { year, month }, income };
            })
            .sort((a, b) => a._id.year - b._id.year || a._id.month - b._id.month);
        })()),
      ]);

      // Get expense trends for the same period
      const expenseMonthlyTrends = (() => {
        const monthlyTotals: Record<string, number> = {};
        const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
        allExpenseTransactions
          .filter((expense: any) => new Date(expense.date) >= cutoffDate)
          .forEach((expense: any) => {
            const date = new Date(expense.date);
            const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
            monthlyTotals[key] = (monthlyTotals[key] || 0) + expense.amount;
          });
        return Object.entries(monthlyTotals)
          .map(([key, expenses]) => {
            const [year, month] = key.split('-').map(Number);
            return { _id: { year, month }, expenses };
          })
          .sort((a, b) => a._id.year - b._id.year || a._id.month - b._id.month);
      })();

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
        .slice(0, limitNum);

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
      const last30DaysFilter = {
        userId,
        date: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        ...(predictive !== "true" && { date: { ...{ $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }, $lte: currentDate } })
      };
      
      const last60DaysFilter = {
        userId,
        date: { $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) },
        ...(predictive !== "true" && { date: { ...{ $gte: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000) }, $lte: currentDate } })
      };

      const last30DaysIncomeTransactions = await Income.find(last30DaysFilter)
        .sort({ date: -1 })
        .select("-__v");

      const last60DaysIncomeTransactions = await Income.find(last60DaysFilter)
        .sort({ date: -1 })
        .select("-__v");

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

      res.status(200).json(
        new ApiResponse(200, dashboardData, "Dashboard data retrieved successfully")
      );
    } catch (error) {
      console.error("Dashboard data fetch error:", error);
      throw new ApiErrors(500, "Failed to fetch dashboard data");
    }
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