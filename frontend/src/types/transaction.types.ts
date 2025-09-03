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
  anomalyDetection?: AnomalyDetection;
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

export interface AnomalyDetection {
  isAnomaly: boolean;
  zScore: number;
  message: string;
  category: string;
  amount: number;
  ewmaMean: number;
  ewmaStandardDeviation: number;
  transactionCount: number;
}

export interface AnomalyTransaction {
  _id: string;
  transactionId: string;
  userId: string;
  isAnomaly: boolean;
  zScore: number;
  confidence: number;
  message: string;
  category: string;
  amount: number;
  updatedAt: string;
  createdAt: string;
}
