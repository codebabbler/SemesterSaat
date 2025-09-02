import { LRUCache } from "lru-cache";
import EWMAAnomalyDetector from "../utils/AnomalyDetector";
import AnomalyModels from "../models/anomaly.models";
import type { IAnomalyStats, IAnomalyDetection } from "../models/anomaly.models";
import type { AnomalyResult, CategoryStats } from "../utils/AnomalyDetector";

const { AnomalyStats, AnomalyDetection } = AnomalyModels;

class AnomalyService {
  private detectors: LRUCache<string, EWMAAnomalyDetector>;
  private loadingDetectors: Map<string, Promise<EWMAAnomalyDetector>> = new Map();

  constructor() {
    // Configure LRU cache with reasonable defaults
    this.detectors = new LRUCache<string, EWMAAnomalyDetector>({
      max: 1000, // Maximum number of detectors to keep in memory
      ttl: 1000 * 60 * 60, // 1 hour TTL for each detector
      allowStale: false, // Don't return stale detectors
      updateAgeOnGet: true, // Reset TTL when accessed
      updateAgeOnHas: true, // Reset TTL when checked
    });
  }

  private getDetectorKey(userId: string, transactionType: 'expense' | 'income'): string {
    return `${userId}-${transactionType}`;
  }

  private async getDetector(userId: string, transactionType: 'expense' | 'income'): Promise<EWMAAnomalyDetector> {
    const key = this.getDetectorKey(userId, transactionType);
    
    // Return existing detector if available
    const existingDetector = this.detectors.get(key);
    if (existingDetector) {
      return existingDetector;
    }
    
    // Check if detector is already being loaded to prevent race condition
    if (this.loadingDetectors.has(key)) {
      return this.loadingDetectors.get(key)!;
    }
    
    // Create loading promise
    const loadingPromise = this.loadDetector(userId, transactionType, key);
    this.loadingDetectors.set(key, loadingPromise);
    
    try {
      const detector = await loadingPromise;
      this.detectors.set(key, detector);
      return detector;
    } finally {
      this.loadingDetectors.delete(key);
    }
  }

  private async loadDetector(userId: string, transactionType: 'expense' | 'income', key: string): Promise<EWMAAnomalyDetector> {
    try {
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
      
      return detector;
    } catch (error) {
      throw new Error(`Failed to load detector for key ${key}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async detectAnomaly(
    userId: string,
    transactionId: string,
    transactionType: 'expense' | 'income',
    category: string,
    amount: number
  ): Promise<AnomalyResult> {
    // Input validation
    if (!userId || typeof userId !== 'string') {
      throw new Error('Invalid userId provided');
    }
    if (!transactionId || typeof transactionId !== 'string') {
      throw new Error('Invalid transactionId provided');
    }
    if (!category || typeof category !== 'string') {
      throw new Error('Invalid category provided');
    }
    if (typeof amount !== 'number' || !isFinite(amount)) {
      throw new Error('Invalid amount provided - must be a finite number');
    }
    if (!['expense', 'income'].includes(transactionType)) {
      throw new Error('Invalid transactionType - must be "expense" or "income"');
    }

    const detector = await this.getDetector(userId, transactionType);
    
    // Create a snapshot of current stats before detection to enable rollback
    const currentStats = detector.cloneCategoryStats(category);
    
    try {
      // Perform anomaly detection (this updates detector internal state)
      const result = detector.detectAnomaly({ category, amount });
      
      // Get updated stats after detection
      const updatedStats = detector.getCategoryStats(category);
      if (!updatedStats) {
        throw new Error(`Category stats not found after detection for category: ${category}`);
      }

      // Save both anomaly detection result and updated stats atomically
      await Promise.all([
        AnomalyDetection.create({
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
        }),
        
        AnomalyStats.findOneAndUpdate(
          { userId, category, transactionType },
          {
            userId,
            category,
            transactionType,
            mean: result.ewmaMean,
            variance: updatedStats.variance,
            count: result.transactionCount,
            lastUpdated: new Date()
          },
          { upsert: true, new: true }
        )
      ]);

      return result;
    } catch (error) {
      // Rollback detector state if database operations failed
      if (currentStats) {
        detector.setCategoryStats(category, currentStats);
      } else {
        detector.resetCategory(category);
      }
      
      throw new Error(`Failed to detect anomaly: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    try {
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
    } catch (error) {
      throw new Error(`Failed to get anomalous transactions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    try {
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
    } catch (error) {
      throw new Error(`Failed to get anomaly stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async resetCategoryStats(userId: string, category: string, transactionType: 'expense' | 'income'): Promise<void> {
    try {
      // 1. Remove from database
      await AnomalyStats.deleteOne({ userId, category, transactionType });

      // 2. Remove from in-memory detector
      const detector = await this.getDetector(userId, transactionType);
      detector.resetCategory(category);
      
    } catch (error) {
      throw new Error(`Failed to reset category stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async resetAllStats(userId: string, transactionType: 'expense' | 'income'): Promise<void> {
    try {
      // 1. Remove from database
      await AnomalyStats.deleteMany({ userId, transactionType });

      // 2. Force LRU cache eviction
      const key = this.getDetectorKey(userId, transactionType);
      this.detectors.delete(key);
      this.loadingDetectors.delete(key);

      // 3. Force cleanup of expired entries to ensure clean state
      this.detectors.purgeStale();
      
    } catch (error) {
      throw new Error(`Failed to reset all stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Complete nuclear reset - wipe ALL anomaly data for a user
  async resetUserData(userId: string): Promise<void> {
    try {
      // 1. Delete all anomaly data from database
      await Promise.all([
        AnomalyStats.deleteMany({ userId }),
        AnomalyDetection.deleteMany({ userId }),
      ]);

      // 2. Clear all user-related cache entries
      for (const [key] of this.detectors.entries()) {
        if (key.startsWith(`${userId}-`)) {
          this.detectors.delete(key);
        }
      }
      
      // 3. Clear any loading operations for this user
      for (const [key] of this.loadingDetectors.entries()) {
        if (key.startsWith(`${userId}-`)) {
          this.loadingDetectors.delete(key);
        }
      }

      // 4. Force cleanup of expired entries
      this.detectors.purgeStale();
      
    } catch (error) {
      throw new Error(`Failed to reset user data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get cache statistics for monitoring
  getCacheStats(): {
    size: number;
    maxSize: number;
    loadingCount: number;
  } {
    return {
      size: this.detectors.size,
      maxSize: this.detectors.max,
      loadingCount: this.loadingDetectors.size,
    };
  }

  // Force cleanup of expired entries (LRU handles this automatically)
  forceCleanup(): void {
    this.detectors.purgeStale();
  }
}

export default new AnomalyService();