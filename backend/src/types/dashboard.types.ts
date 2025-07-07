import type { IIncome } from "../models/income.models";
import type { IExpense } from "../models/expense.models";

// Dashboard data interfaces
export interface DashboardSummary {
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  savingsRate: number;
}

export interface PeriodData {
  total: number;
  count: number;
  average: number;
  transactions: (IIncome | IExpense)[];
}

export interface TransactionWithType {
  _id: string;
  userId: string;
  icon?: string;
  amount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
  type: 'income' | 'expense';
  source?: string;
  category?: string;
}

export interface CategoryBreakdown {
  name: string;
  amount: number;
  percentage: number;
  count: number;
}

export interface MonthlyTrend {
  month: number;
  year: number;
  income: number;
  expenses: number;
  balance: number;
}

export interface DashboardResponse {
  summary: DashboardSummary;
  last30Days: PeriodData;
  last60Days: PeriodData;
  recentTransactions: TransactionWithType[];
  topExpenseCategories: CategoryBreakdown[];
  topIncomeSource: CategoryBreakdown[];
  monthlyTrends: MonthlyTrend[];
}

// Financial Summary interfaces
export interface FinancialPeriod {
  startDate: string;
  endDate: string;
  days: number;
}

export interface FinancialStats {
  total: number;
  count: number;
  average: number;
  max: number;
  min: number;
}

export interface FinancialSummaryResponse {
  period: FinancialPeriod;
  income: FinancialStats;
  expenses: FinancialStats;
  netIncome: number;
  savingsRate: number;
}

// Cash Flow interfaces
export interface CashFlowPeriod {
  year?: number;
  month?: number;
  week?: number;
  day?: number;
}

export interface CashFlowData {
  _id: CashFlowPeriod;
  amount: number;
  count: number;
}

export interface NetFlowData {
  period: CashFlowPeriod;
  netAmount: number;
  incomeAmount: number;
  expenseAmount: number;
}

export interface CashFlowResponse {
  period: string;
  income: CashFlowData[];
  expenses: CashFlowData[];
  netFlow: NetFlowData[];
}