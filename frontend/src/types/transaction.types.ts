export type RecurringPeriod = "daily" | "weekly" | "monthly" | "yearly" | "";

export interface BaseTransaction {
  _id: string;
  amount: number;
  date: string;
  icon?: string;
  isRecurring?: boolean;
  recurringPeriod?: RecurringPeriod;
  isVirtual?: boolean;
  originalId?: string;
}

export interface ExpenseData extends BaseTransaction {
  category: string;
  description?: string;
}

export interface IncomeData extends BaseTransaction {
  source: string;
  description?: string;
}

export interface ExpenseFormData
  extends Omit<ExpenseData, "_id" | "amount" | "isVirtual" | "originalId"> {
  amount: string;
  recurringPeriod: RecurringPeriod;
  isRecurring: boolean;
}

export interface IncomeFormData
  extends Omit<IncomeData, "_id" | "amount" | "isVirtual" | "originalId"> {
  amount: string;
  recurringPeriod: RecurringPeriod;
  isRecurring: boolean;
}

export interface Transaction {
  _id: string;
  description?: string;
  category?: string;
  source?: string;
  icon?: string;
  date: string;
  amount: number;
  isRecurring?: boolean;
  recurringPeriod?: RecurringPeriod;
  isVirtual?: boolean;
  originalId?: string;
}

export interface PredictionResult {
  category?: string;
  source?: string;
  confidence: number;
  isHighConfidence: boolean;
  suggestFeedback: boolean;
  mlServiceDown?: boolean;
}

export interface ExpenseLineData {
  date: string;
  amount: number;
  category: string;
  isRecurring?: boolean;
  recurringPeriod?: RecurringPeriod;
  isVirtual?: boolean;
}
