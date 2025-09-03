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

  constructor(alpha: number = 0.2, zScoreThreshold: number = 2.5) {
    this.ALPHA = alpha;
    this.Z_SCORE_THRESHOLD = zScoreThreshold;
    this.categoryStats = new Map();
  }

  detectAnomaly(newTransaction: Transaction): AnomalyResult {
    const category = newTransaction.category;
    const amount = newTransaction.amount;

    // 1. FIRST TRANSACTION: Always baseline, never anomaly
    if (!this.categoryStats.has(category)) {
      this.categoryStats.set(category, {
        mean: amount,
        variance: 0,
        count: 1,
      });

      return {
        isAnomaly: false,
        zScore: 0,
        message: `First transaction in category '${category}'. Amount NPR${amount.toFixed(2)} used as baseline.`,
        category: category,
        amount: amount,
        ewmaMean: amount,
        ewmaStandardDeviation: 0,
        transactionCount: 1,
      };
    }

    const stats = this.categoryStats.get(category)!;
    const previousMean = stats.mean;
    const previousVariance = stats.variance;
    const previousCount = stats.count;
    const newCount = stats.count + 1;

    // Calculate EWMA statistics first
    const newMean = this.ALPHA * amount + (1 - this.ALPHA) * previousMean;
    const newVariance =
      this.ALPHA * Math.pow(amount - previousMean, 2) +
      (1 - this.ALPHA) * previousVariance;

    // Apply minimum variance floor for early transactions to prevent hypersensitivity
    const newMinVarianceFloor = this.getMinimumVarianceFloor(newMean, newCount);
    const adjustedNewVariance = Math.max(newVariance, newMinVarianceFloor);
    const newStandardDeviation = Math.sqrt(adjustedNewVariance);

    const previousMinVarianceFloor = this.getMinimumVarianceFloor(
      previousMean,
      previousCount
    );
    const adjustedPreviousVariance = Math.max(
      previousVariance,
      previousMinVarianceFloor
    );
    const previousStandardDeviation = Math.sqrt(adjustedPreviousVariance);

    let zScore = 0;
    let isAnomaly = false;

    const ratio = Math.abs(previousMean) > 0.01 ? amount / previousMean : 1;
    const MIN_SIGMA = 1e-8;

    // 2. WHEN SIGMA > 0: Z-score test + extreme ratio guard (5x/0.2x thresholds)
    if (previousStandardDeviation > MIN_SIGMA) {
      zScore = (amount - previousMean) / previousStandardDeviation;
      isAnomaly = Math.abs(zScore) > this.Z_SCORE_THRESHOLD;

      // Extreme ratio guard: >5x or <0.2x always anomaly
      if (ratio > 5.0 || ratio < 0.2) {
        isAnomaly = true;
        if (Math.abs(zScore) < 3.0) {
          zScore = ratio > 1 ? 3.5 : -3.5;
        }
      }
    }
    // 3. WHEN SIGMA = 0: Adaptive percentage + extreme ratio guard (10x/0.1x thresholds)
    else {
      // Extreme ratio guard: >10x or <0.1x with |Z|≥10 always anomaly
      if (ratio > 10.0 || ratio < 0.1) {
        isAnomaly = true;
        zScore =
          ratio > 1 ? Math.max(10.0, ratio) : Math.min(-10.0, -1 / ratio);
      }
      // Adaptive percentage fallback
      else {
        const percentageThreshold = previousCount <= 3 ? 0.7 : 0.5; // 70% for ≤3 tx, 50% afterwards
        const percentageChange =
          Math.abs(amount - previousMean) / Math.abs(previousMean);

        if (percentageChange > percentageThreshold) {
          isAnomaly = true;
          zScore = amount > previousMean ? 3.0 : -3.0;
        } else {
          isAnomaly = false;
          zScore = 0;
        }
      }
    }

    // Update stats after detection
    this.categoryStats.set(category, {
      mean: newMean,
      variance: newVariance,
      count: newCount,
    });

    return {
      isAnomaly: isAnomaly,
      zScore: zScore,
      message: isAnomaly
        ? `Anomaly detected: Transaction amount NPR${amount.toFixed(2)} is ${Math.abs(zScore).toFixed(2)} standard deviations from EWMA mean (NPR${previousMean.toFixed(2)}) for category '${category}'.`
        : `Normal transaction: Amount NPR${amount.toFixed(2)} is within normal range for category '${category}' (Z-score: ${zScore.toFixed(2)}).`,
      category: category,
      amount: amount,
      ewmaMean: newMean,
      ewmaStandardDeviation: newStandardDeviation,
      transactionCount: newCount,
    };
  }

  getCategoryStats(category: string): CategoryStats | null {
    return this.categoryStats.get(category) || null;
  }

  // Helper method to calculate minimum variance floor for early transactions
  private getMinimumVarianceFloor(
    mean: number,
    transactionCount: number
  ): number {
    // Apply minimum variance floor only for early transactions (≤10)
    if (transactionCount <= 10) {
      const percentageFloor = transactionCount <= 5 ? 0.15 : 0.1; // 15% then 10%
      return Math.pow(Math.abs(mean) * percentageFloor, 2);
    }
    return 0; // No floor for established patterns
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

  // Method to create a deep copy of category stats for rollback
  cloneCategoryStats(category: string): CategoryStats | null {
    const stats = this.categoryStats.get(category);
    if (!stats) return null;
    return {
      mean: stats.mean,
      variance: stats.variance,
      count: stats.count,
    };
  }
}

export default EWMAAnomalyDetector;
export type { AnomalyResult, Transaction, CategoryStats };
