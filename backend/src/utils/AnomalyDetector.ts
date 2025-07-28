interface CategoryStats {
  mean: number;
  variance: number;
  count: number;
}

interface AnomalyResult {
  isAnomaly: boolean;
  zScore: number;
  message: string;
  category: string;
  amount: number;
  ewmaMean: number;
  ewmaStandardDeviation: number;
  transactionCount: number;
}

interface Transaction {
  category: string;
  amount: number;
}

class EWMAAnomalyDetector {
  private ALPHA: number;
  private Z_SCORE_THRESHOLD: number;
  private categoryStats: Map<string, CategoryStats>;

  constructor(alpha: number = 0.2, zScoreThreshold: number = 3.0) {
    this.ALPHA = alpha;
    this.Z_SCORE_THRESHOLD = zScoreThreshold;
    this.categoryStats = new Map();
  }

  detectAnomaly(newTransaction: Transaction): AnomalyResult {
    const category = newTransaction.category;
    const amount = newTransaction.amount;
    
    if (!this.categoryStats.has(category)) {
      this.categoryStats.set(category, {
        mean: amount,
        variance: 0,
        count: 1
      });
      
      return {
        isAnomaly: false,
        zScore: 0,
        message: `First transaction in category '${category}'. Amount $${amount.toFixed(2)} used as baseline.`,
        category: category,
        amount: amount,
        ewmaMean: amount,
        ewmaStandardDeviation: 0,
        transactionCount: 1
      };
    }

    const stats = this.categoryStats.get(category)!;
    const previousMean = stats.mean;
    const previousVariance = stats.variance;
    
    const newMean = this.ALPHA * amount + (1 - this.ALPHA) * previousMean;
    const newVariance = (1 - this.ALPHA) * (previousVariance + this.ALPHA * Math.pow(amount - previousMean, 2));
    const newStandardDeviation = Math.sqrt(newVariance);
    
    this.categoryStats.set(category, {
      mean: newMean,
      variance: newVariance,
      count: stats.count + 1
    });

    if (newStandardDeviation === 0) {
      const isAnomaly = amount !== newMean;
      return {
        isAnomaly: isAnomaly,
        zScore: isAnomaly ? Infinity : 0,
        message: isAnomaly 
          ? `Anomaly detected: First deviation from baseline in '${category}'. Expected $${newMean.toFixed(2)}, got $${amount.toFixed(2)}.`
          : `Normal transaction: Amount matches baseline for '${category}' ($${newMean.toFixed(2)}).`,
        category: category,
        amount: amount,
        ewmaMean: newMean,
        ewmaStandardDeviation: newStandardDeviation,
        transactionCount: stats.count + 1
      };
    }

    const zScore = (amount - newMean) / newStandardDeviation;
    const isAnomaly = Math.abs(zScore) > this.Z_SCORE_THRESHOLD;

    return {
      isAnomaly: isAnomaly,
      zScore: zScore,
      message: isAnomaly 
        ? `Anomaly detected: Transaction amount $${amount.toFixed(2)} is ${Math.abs(zScore).toFixed(2)} standard deviations from EWMA mean ($${newMean.toFixed(2)}) for category '${category}'.`
        : `Normal transaction: Amount $${amount.toFixed(2)} is within normal range for category '${category}' (Z-score: ${zScore.toFixed(2)}).`,
      category: category,
      amount: amount,
      ewmaMean: newMean,
      ewmaStandardDeviation: newStandardDeviation,
      transactionCount: stats.count + 1
    };
  }

  getCategoryStats(category: string): CategoryStats | null {
    return this.categoryStats.get(category) || null;
  }

  resetCategory(category: string): void {
    this.categoryStats.delete(category);
  }

  resetAllCategories(): void {
    this.categoryStats.clear();
  }

  // Method to initialize stats from existing data (for persistence)
  setCategoryStats(category: string, stats: CategoryStats): void {
    this.categoryStats.set(category, stats);
  }

  // Method to get all category stats (for persistence)
  getAllCategoryStats(): Map<string, CategoryStats> {
    return new Map(this.categoryStats);
  }
}

export default EWMAAnomalyDetector;
export type { AnomalyResult, Transaction, CategoryStats };