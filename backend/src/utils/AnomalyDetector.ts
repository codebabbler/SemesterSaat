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

    if (!this.categoryStats.has(category)) {
      this.categoryStats.set(category, {
        mean: amount,
        variance: 0,
        count: 1,
      });

      return {
        isAnomaly: false,
        zScore: 0,
        message: `First transaction in category '${category}'. Amount $${amount.toFixed(2)} used as baseline.`,
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
    const newCount = stats.count + 1;

    // Calculate Z-score BEFORE updating the mean
    const previousStandardDeviation = Math.sqrt(previousVariance);
    let zScore = 0;
    let isAnomaly = false;

    if (previousStandardDeviation > 0) {
      zScore = (amount - previousMean) / previousStandardDeviation;
      isAnomaly = Math.abs(zScore) > this.Z_SCORE_THRESHOLD;

      // Additional check for extreme values even if standard deviation exists
      const ratio = amount / previousMean;
      if (ratio > 5 || ratio < 0.2) {
        isAnomaly = true;
        // Boost Z-score for extreme ratios to ensure they're clearly flagged
        if (Math.abs(zScore) < 3.0) {
          zScore = zScore > 0 ? Math.max(zScore, 3.5) : Math.min(zScore, -3.5);
        }
      }
    } else if (stats.count >= 2) {
      // For transactions when variance is still 0, use percentage-based threshold
      const percentageDifference = Math.abs(
        (amount - previousMean) / previousMean
      );
      // Use a more generous threshold for early transactions to avoid false positives
      // but still catch genuine anomalies
      let thresholdPercent = 0.5; // 50% default

      // If we have very few transactions, be more lenient for normal variations
      if (stats.count <= 3) {
        thresholdPercent = 0.7; // 70% for first few transactions
      }

      // However, if the difference is extreme (> 10x or < 0.1x), always flag as anomaly
      const ratio = amount / previousMean;
      if (ratio > 10 || ratio < 0.1) {
        isAnomaly = true;
        zScore = amount > previousMean ? 10 : -10; // Extreme Z-score for extreme anomalies
      } else {
        isAnomaly = percentageDifference > thresholdPercent;

        // Calculate a meaningful Z-score for percentage-based detection
        if (isAnomaly) {
          // Scale the percentage difference to a Z-score equivalent
          const scaledZScore =
            (percentageDifference / thresholdPercent) *
            (this.Z_SCORE_THRESHOLD + 1);
          zScore = amount > previousMean ? scaledZScore : -scaledZScore;
          // Ensure Z-score is at least above threshold for true anomalies
          if (Math.abs(zScore) < this.Z_SCORE_THRESHOLD) {
            zScore =
              amount > previousMean
                ? this.Z_SCORE_THRESHOLD + 1
                : -(this.Z_SCORE_THRESHOLD + 1);
          }
        } else {
          zScore =
            (percentageDifference / thresholdPercent) *
            this.Z_SCORE_THRESHOLD *
            (amount > previousMean ? 1 : -1);
        }
      }
    }

    // Now update the EWMA statistics
    const newMean = this.ALPHA * amount + (1 - this.ALPHA) * previousMean;
    const newVariance =
      this.ALPHA * Math.pow(amount - previousMean, 2) +
      (1 - this.ALPHA) * previousVariance;
    const newStandardDeviation = Math.sqrt(newVariance);

    this.categoryStats.set(category, {
      mean: newMean,
      variance: newVariance,
      count: newCount,
    });

    return {
      isAnomaly: isAnomaly,
      zScore: zScore,
      message: isAnomaly
        ? `Anomaly detected: Transaction amount $${amount.toFixed(2)} is ${Math.abs(zScore).toFixed(2)} standard deviations from EWMA mean ($${previousMean.toFixed(2)}) for category '${category}'.`
        : `Normal transaction: Amount $${amount.toFixed(2)} is within normal range for category '${category}' (Z-score: ${zScore.toFixed(2)}).`,
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
