import EWMAAnomalyDetector from "../utils/AnomalyDetector";
import AnomalyModels from "../models/anomaly.models";
import type { IAnomalyStats, IAnomalyDetection } from "../models/anomaly.models";
import type { AnomalyResult, CategoryStats } from "../utils/AnomalyDetector";

const { AnomalyStats, AnomalyDetection } = AnomalyModels;

class AnomalyService {
  private detectors: Map<string, EWMAAnomalyDetector> = new Map();

  private getDetectorKey(userId: string, transactionType: 'expense' | 'income'): string {
    return `${userId}-${transactionType}`;
  }

  private async getDetector(userId: string, transactionType: 'expense' | 'income'): Promise<EWMAAnomalyDetector> {
    const key = this.getDetectorKey(userId, transactionType);
    
    if (!this.detectors.has(key)) {
      const detector = new EWMAAnomalyDetector();
      
      // Load existing stats from database
      const existingStats = await AnomalyStats.find({ userId, transactionType });
      
      for (const stat of existingStats) {
        detector.setCategoryStats(stat.category, {
          mean: stat.mean,
          variance: stat.variance,
          count: stat.count
        });
      }
      
      this.detectors.set(key, detector);
    }
    
    return this.detectors.get(key)!;
  }

  async detectAnomaly(
    userId: string,
    transactionId: string,
    transactionType: 'expense' | 'income',
    category: string,
    amount: number
  ): Promise<AnomalyResult> {
    const detector = await this.getDetector(userId, transactionType);
    
    const result = detector.detectAnomaly({ category, amount });
    
    // Save the anomaly detection result
    await AnomalyDetection.create({
      userId,
      transactionId,
      transactionType,
      category: result.category,
      amount: result.amount,
      isAnomaly: result.isAnomaly,
      zScore: result.zScore,
      message: result.message,
      ewmaMean: result.ewmaMean,
      ewmaStandardDeviation: result.ewmaStandardDeviation,
      transactionCount: result.transactionCount,
      detectedAt: new Date()
    });

    // Update/save the category stats in database
    await AnomalyStats.findOneAndUpdate(
      { userId, category, transactionType },
      {
        userId,
        category,
        transactionType,
        mean: result.ewmaMean,
        variance: detector.getCategoryStats(category)?.variance || 0,
        count: result.transactionCount,
        lastUpdated: new Date()
      },
      { upsert: true, new: true }
    );

    return result;
  }

  async getAnomalousTransactions(
    userId: string,
    transactionType?: 'expense' | 'income',
    limit: number = 10,
    page: number = 1
  ): Promise<{
    anomalies: IAnomalyDetection[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> {
    const skip = (page - 1) * limit;
    const filter: any = { userId, isAnomaly: true };
    
    if (transactionType) {
      filter.transactionType = transactionType;
    }

    const anomalies = await AnomalyDetection.find(filter)
      .sort({ detectedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select("-__v");

    const totalCount = await AnomalyDetection.countDocuments(filter);

    return {
      anomalies,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalItems: totalCount,
        itemsPerPage: limit,
      },
    };
  }

  async getAnomalyStats(userId: string, transactionType?: 'expense' | 'income'): Promise<{
    totalAnomalies: number;
    anomaliesByCategory: Array<{
      category: string;
      anomalyCount: number;
      totalTransactions: number;
      anomalyRate: number;
    }>;
    recentAnomalies: IAnomalyDetection[];
  }> {
    const filter: any = { userId };
    
    if (transactionType) {
      filter.transactionType = transactionType;
    }

    // Get total anomalies count
    const totalAnomalies = await AnomalyDetection.countDocuments({ ...filter, isAnomaly: true });

    // Get anomalies by category
    const anomaliesByCategory = await AnomalyDetection.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$category",
          anomalyCount: { $sum: { $cond: [{ $eq: ["$isAnomaly", true] }, 1, 0] } },
          totalTransactions: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          category: "$_id",
          anomalyCount: 1,
          totalTransactions: 1,
          anomalyRate: {
            $cond: [
              { $eq: ["$totalTransactions", 0] },
              0,
              { $multiply: [{ $divide: ["$anomalyCount", "$totalTransactions"] }, 100] }
            ]
          }
        },
      },
      { $sort: { anomalyCount: -1 } },
    ]);

    // Get recent anomalies
    const recentAnomalies = await AnomalyDetection.find({ ...filter, isAnomaly: true })
      .sort({ detectedAt: -1 })
      .limit(5)
      .select("-__v");

    return {
      totalAnomalies,
      anomaliesByCategory,
      recentAnomalies,
    };
  }

  async resetCategoryStats(userId: string, category: string, transactionType: 'expense' | 'income'): Promise<void> {
    // Remove from database
    await AnomalyStats.deleteOne({ userId, category, transactionType });

    // Remove from in-memory detector
    const detector = await this.getDetector(userId, transactionType);
    detector.resetCategory(category);
  }

  async resetAllStats(userId: string, transactionType: 'expense' | 'income'): Promise<void> {
    // Remove from database
    await AnomalyStats.deleteMany({ userId, transactionType });

    // Remove from in-memory detector
    const key = this.getDetectorKey(userId, transactionType);
    this.detectors.delete(key);
  }
}

export default new AnomalyService();