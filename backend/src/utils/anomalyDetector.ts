interface Transaction {
  amount: number;
  category?: string;
  source?: string;
  date: Date;
  _id: string;
}

interface AnomalyResult {
  isAnomaly: boolean;
  zScore: number;
  message: string;
  confidence: 'high' | 'medium' | 'low';
  severity: 'critical' | 'warning' | 'info';
  statisticalContext: {
    mean: number;
    standardDeviation: number;
    sampleSize: number;
    categoryAnalyzed: string;
  };
}

interface AnomalyDetectorConfig {
  minTransactions: number;
  zScoreThreshold: number;
  criticalThreshold: number;
  warningThreshold: number;
}

class AnomalyDetector {
  private config: AnomalyDetectorConfig;

  constructor(config: Partial<AnomalyDetectorConfig> = {}) {
    this.config = {
      minTransactions: config.minTransactions || 10,
      zScoreThreshold: config.zScoreThreshold || 2.5,
      criticalThreshold: config.criticalThreshold || 4.0,
      warningThreshold: config.warningThreshold || 2.5,
      ...config
    };
  }

  /**
   * Detects if a new transaction is anomalous based on historical data
   */
  detectExpenseAnomaly(
    newTransaction: Transaction,
    historicalTransactions: Transaction[]
  ): AnomalyResult {
    const category = newTransaction.category;
    if (!category) {
      return this.createNormalResult(newTransaction.amount, 'Unknown', 0, 0, 0);
    }

    // Filter historical transactions by the same category
    const categoryTransactions = historicalTransactions.filter(
      (transaction) => transaction.category === category
    );

    // Check if we have enough data for reliable analysis
    if (categoryTransactions.length < this.config.minTransactions) {
      return {
        isAnomaly: false,
        zScore: 0,
        message: `Insufficient historical data for category "${category}". Need at least ${this.config.minTransactions} transactions, found ${categoryTransactions.length}.`,
        confidence: 'low',
        severity: 'info',
        statisticalContext: {
          mean: 0,
          standardDeviation: 0,
          sampleSize: categoryTransactions.length,
          categoryAnalyzed: category
        }
      };
    }

    return this.performStatisticalAnalysis(newTransaction, categoryTransactions, category);
  }

  /**
   * Detects if a new income transaction is anomalous
   */
  detectIncomeAnomaly(
    newTransaction: Transaction,
    historicalTransactions: Transaction[]
  ): AnomalyResult {
    const source = newTransaction.source;
    if (!source) {
      return this.createNormalResult(newTransaction.amount, 'Unknown', 0, 0, 0);
    }

    // Filter historical transactions by the same source
    const sourceTransactions = historicalTransactions.filter(
      (transaction) => transaction.source === source
    );

    if (sourceTransactions.length < this.config.minTransactions) {
      return {
        isAnomaly: false,
        zScore: 0,
        message: `Insufficient historical data for income source "${source}". Need at least ${this.config.minTransactions} transactions, found ${sourceTransactions.length}.`,
        confidence: 'low',
        severity: 'info',
        statisticalContext: {
          mean: 0,
          standardDeviation: 0,
          sampleSize: sourceTransactions.length,
          categoryAnalyzed: source
        }
      };
    }

    return this.performStatisticalAnalysis(newTransaction, sourceTransactions, source);
  }

  /**
   * Performs the core statistical analysis for anomaly detection
   */
  private performStatisticalAnalysis(
    newTransaction: Transaction,
    historicalTransactions: Transaction[],
    categoryOrSource: string
  ): AnomalyResult {
    const amounts = historicalTransactions.map(t => t.amount);
    const mean = this.calculateMean(amounts);
    const standardDeviation = this.calculateStandardDeviation(amounts, mean);

    // Handle the case where all transactions have the same amount
    if (standardDeviation === 0) {
      const isAnomaly = newTransaction.amount !== mean;
      return {
        isAnomaly,
        zScore: isAnomaly ? Infinity : 0,
        message: isAnomaly 
          ? `Anomalous transaction detected! All previous transactions in "${categoryOrSource}" were exactly $${mean.toFixed(2)}, but this transaction is $${newTransaction.amount.toFixed(2)}.`
          : `Normal transaction. Amount matches the consistent pattern of $${mean.toFixed(2)} for "${categoryOrSource}".`,
        confidence: 'high',
        severity: isAnomaly ? 'critical' : 'info',
        statisticalContext: {
          mean,
          standardDeviation,
          sampleSize: amounts.length,
          categoryAnalyzed: categoryOrSource
        }
      };
    }

    // Calculate Z-score
    const zScore = (newTransaction.amount - mean) / standardDeviation;
    const absZScore = Math.abs(zScore);
    const isAnomaly = absZScore > this.config.zScoreThreshold;

    let severity: 'critical' | 'warning' | 'info' = 'info';
    let confidence: 'high' | 'medium' | 'low' = 'low';

    if (absZScore > this.config.criticalThreshold) {
      severity = 'critical';
      confidence = 'high';
    } else if (absZScore > this.config.warningThreshold) {
      severity = 'warning';
      confidence = 'medium';
    }

    const direction = zScore > 0 ? 'higher' : 'lower';
    const percentage = ((Math.abs(newTransaction.amount - mean) / mean) * 100).toFixed(1);

    let message: string;
    if (isAnomaly) {
      message = `🚨 Anomalous transaction detected! This $${newTransaction.amount.toFixed(2)} transaction in "${categoryOrSource}" is ${percentage}% ${direction} than usual (avg: $${mean.toFixed(2)}, std dev: $${standardDeviation.toFixed(2)}).`;
    } else {
      message = `✅ Normal transaction. $${newTransaction.amount.toFixed(2)} is within expected range for "${categoryOrSource}" (avg: $${mean.toFixed(2)}).`;
    }

    return {
      isAnomaly,
      zScore,
      message,
      confidence,
      severity,
      statisticalContext: {
        mean,
        standardDeviation,
        sampleSize: amounts.length,
        categoryAnalyzed: categoryOrSource
      }
    };
  }

  /**
   * Creates a result for normal/non-analyzable transactions
   */
  private createNormalResult(
    amount: number,
    category: string,
    mean: number,
    stdDev: number,
    sampleSize: number
  ): AnomalyResult {
    return {
      isAnomaly: false,
      zScore: 0,
      message: `Transaction amount $${amount.toFixed(2)} recorded without anomaly analysis.`,
      confidence: 'low',
      severity: 'info',
      statisticalContext: {
        mean,
        standardDeviation: stdDev,
        sampleSize,
        categoryAnalyzed: category
      }
    };
  }

  /**
   * Calculates the mean of an array of numbers
   */
  private calculateMean(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((sum, num) => sum + num, 0) / numbers.length;
  }

  /**
   * Calculates the standard deviation of an array of numbers
   */
  private calculateStandardDeviation(numbers: number[], mean: number): number {
    if (numbers.length === 0) return 0;
    const squaredDifferences = numbers.map(num => Math.pow(num - mean, 2));
    const variance = this.calculateMean(squaredDifferences);
    return Math.sqrt(variance);
  }

  /**
   * Analyzes multiple transactions for batch anomaly detection
   */
  detectBatchAnomalies(
    transactions: Transaction[],
    historicalTransactions: Transaction[],
    type: 'expense' | 'income' = 'expense'
  ): (Transaction & { anomalyResult: AnomalyResult })[] {
    return transactions.map(transaction => ({
      ...transaction,
      anomalyResult: type === 'expense' 
        ? this.detectExpenseAnomaly(transaction, historicalTransactions)
        : this.detectIncomeAnomaly(transaction, historicalTransactions)
    }));
  }

  /**
   * Gets anomaly statistics for a category or source
   */
  getCategoryStatistics(
    categoryOrSource: string,
    historicalTransactions: Transaction[],
    type: 'category' | 'source' = 'category'
  ): {
    mean: number;
    standardDeviation: number;
    min: number;
    max: number;
    count: number;
    median: number;
  } | null {
    const filtered = historicalTransactions.filter(t => 
      type === 'category' ? t.category === categoryOrSource : t.source === categoryOrSource
    );

    if (filtered.length === 0) return null;

    const amounts = filtered.map(t => t.amount).sort((a, b) => a - b);
    const mean = this.calculateMean(amounts);

    return {
      mean,
      standardDeviation: this.calculateStandardDeviation(amounts, mean),
      min: amounts[0],
      max: amounts[amounts.length - 1],
      count: amounts.length,
      median: amounts.length % 2 === 0 
        ? (amounts[amounts.length / 2 - 1] + amounts[amounts.length / 2]) / 2
        : amounts[Math.floor(amounts.length / 2)]
    };
  }
}

export default AnomalyDetector;
export type { Transaction, AnomalyResult, AnomalyDetectorConfig };