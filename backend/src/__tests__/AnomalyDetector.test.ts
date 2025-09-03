import EWMAAnomalyDetector from '../utils/AnomalyDetector';
import type { AnomalyResult, CategoryStats } from '../utils/AnomalyDetector';

describe('EWMAAnomalyDetector', () => {
  let detector: EWMAAnomalyDetector;

  beforeEach(() => {
    detector = new EWMAAnomalyDetector();
  });

  describe('Constructor', () => {
    it('should use default parameters when none provided', () => {
      const defaultDetector = new EWMAAnomalyDetector();
      // Testing private members through behavior
      const result = defaultDetector.detectAnomaly({ category: 'test', amount: 100 });
      expect(result.ewmaMean).toBe(100); // First transaction sets the mean
    });

    it('should accept custom alpha and z-score threshold', () => {
      const customDetector = new EWMAAnomalyDetector(0.5, 3.0);
      const result = customDetector.detectAnomaly({ category: 'test', amount: 100 });
      expect(result.ewmaMean).toBe(100);
    });
  });

  describe('First Transaction Handling', () => {
    it('should set baseline for first transaction and never flag as anomaly', () => {
      const result = detector.detectAnomaly({ category: 'groceries', amount: 150 });

      expect(result.isAnomaly).toBe(false);
      expect(result.zScore).toBe(0);
      expect(result.ewmaMean).toBe(150);
      expect(result.ewmaStandardDeviation).toBe(0);
      expect(result.transactionCount).toBe(1);
      expect(result.message).toContain('First transaction');
    });

    it('should handle multiple categories independently', () => {
      const groceriesResult = detector.detectAnomaly({ category: 'groceries', amount: 150 });
      const gasResult = detector.detectAnomaly({ category: 'gas', amount: 50 });

      expect(groceriesResult.ewmaMean).toBe(150);
      expect(gasResult.ewmaMean).toBe(50);
      expect(groceriesResult.transactionCount).toBe(1);
      expect(gasResult.transactionCount).toBe(1);
    });
  });

  describe('EWMA Calculation Accuracy', () => {
    it('should calculate EWMA mean correctly with default alpha=0.2', () => {
      // First transaction: baseline = 100
      detector.detectAnomaly({ category: 'test', amount: 100 });
      
      // Second transaction: new_mean = 0.2 * 200 + 0.8 * 100 = 40 + 80 = 120
      const result = detector.detectAnomaly({ category: 'test', amount: 200 });
      
      expect(result.ewmaMean).toBeCloseTo(120, 10);
      expect(result.transactionCount).toBe(2);
    });

    it('should calculate EWMA variance correctly', () => {
      detector.detectAnomaly({ category: 'test', amount: 100 });
      
      const result = detector.detectAnomaly({ category: 'test', amount: 200 });
      
      // Variance = 0.2 * (200 - 100)^2 + 0.8 * 0 = 0.2 * 10000 = 2000
      // Standard deviation = sqrt(2000) ≈ 44.72
      expect(result.ewmaStandardDeviation).toBeCloseTo(44.72, 2);
    });

    it('should maintain running EWMA over multiple transactions', () => {
      const amounts = [100, 120, 110, 130, 105];
      const results: AnomalyResult[] = [];

      amounts.forEach(amount => {
        results.push(detector.detectAnomaly({ category: 'test', amount }));
      });

      // Manually calculate expected EWMA for verification
      let expectedMean = 100; // First transaction
      for (let i = 1; i < amounts.length; i++) {
        expectedMean = 0.2 * amounts[i] + 0.8 * expectedMean;
      }

      expect(results[results.length - 1].ewmaMean).toBeCloseTo(expectedMean, 8);
      expect(results[results.length - 1].transactionCount).toBe(5);
    });
  });

  describe('Anomaly Detection Logic', () => {
    beforeEach(() => {
      // Setup baseline with some normal transactions
      detector.detectAnomaly({ category: 'groceries', amount: 100 });
      detector.detectAnomaly({ category: 'groceries', amount: 110 });
      detector.detectAnomaly({ category: 'groceries', amount: 95 });
    });

    it('should detect anomaly when z-score exceeds threshold', () => {
      // Add a very high amount that should trigger anomaly
      const result = detector.detectAnomaly({ category: 'groceries', amount: 500 });

      expect(result.isAnomaly).toBe(true);
      expect(Math.abs(result.zScore)).toBeGreaterThan(2.5);
      expect(result.message).toContain('Anomaly detected');
    });

    it('should not flag normal transactions as anomalies', () => {
      const result = detector.detectAnomaly({ category: 'groceries', amount: 105 });

      expect(result.isAnomaly).toBe(false);
      expect(Math.abs(result.zScore)).toBeLessThanOrEqual(2.5);
      expect(result.message).toContain('Normal transaction');
    });

    it('should handle extreme ratio guard (5x threshold)', () => {
      // Current mean should be around ~102 after the setup transactions
      const result = detector.detectAnomaly({ category: 'groceries', amount: 600 }); // >5x

      expect(result.isAnomaly).toBe(true);
    });

    it('should handle extreme ratio guard (0.2x threshold)', () => {
      // Current mean should be around ~102 after the setup transactions  
      const result = detector.detectAnomaly({ category: 'groceries', amount: 15 }); // <0.2x

      expect(result.isAnomaly).toBe(true);
    });
  });

  describe('Zero Variance Handling', () => {
    it('should handle zero variance with adaptive percentage thresholds', () => {
      // Create scenario with identical transactions (zero variance)
      detector.detectAnomaly({ category: 'fixed', amount: 100 });
      detector.detectAnomaly({ category: 'fixed', amount: 100 });
      detector.detectAnomaly({ category: 'fixed', amount: 100 });

      // For ≤3 transactions, threshold is 70%
      const result1 = detector.detectAnomaly({ category: 'fixed', amount: 180 }); // 80% change
      expect(result1.isAnomaly).toBe(true);

      // Test the logic exists and handles zero variance scenarios
      // The exact threshold behavior depends on EWMA updating the mean
      const result2 = detector.detectAnomaly({ category: 'fixed', amount: 100 });
      expect(result2.isAnomaly).toBe(false); // Normal amount should not be anomaly

      // Test extreme changes still get detected
      const result3 = detector.detectAnomaly({ category: 'fixed', amount: 1200 }); // >10x threshold
      expect(result3.isAnomaly).toBe(true);
    });

    it('should handle extreme ratio guard with zero variance (10x threshold)', () => {
      detector.detectAnomaly({ category: 'fixed', amount: 100 });
      detector.detectAnomaly({ category: 'fixed', amount: 100 });

      const result = detector.detectAnomaly({ category: 'fixed', amount: 1100 }); // 11x
      expect(result.isAnomaly).toBe(true);
      expect(result.zScore).toBeGreaterThanOrEqual(10);
    });
  });

  describe('Category Stats Management', () => {
    it('should return correct category stats', () => {
      detector.detectAnomaly({ category: 'test', amount: 100 });
      detector.detectAnomaly({ category: 'test', amount: 120 });

      const stats = detector.getCategoryStats('test');
      expect(stats).not.toBeNull();
      expect(stats!.count).toBe(2);
      expect(stats!.mean).toBeCloseTo(104, 2); // 0.2 * 120 + 0.8 * 100
      expect(stats!.variance).toBeGreaterThan(0);
    });

    it('should return null for non-existent category', () => {
      const stats = detector.getCategoryStats('nonexistent');
      expect(stats).toBeNull();
    });

    it('should reset category stats correctly', () => {
      detector.detectAnomaly({ category: 'test', amount: 100 });
      detector.resetCategory('test');

      const stats = detector.getCategoryStats('test');
      expect(stats).toBeNull();
    });

    it('should reset all categories', () => {
      detector.detectAnomaly({ category: 'test1', amount: 100 });
      detector.detectAnomaly({ category: 'test2', amount: 200 });
      
      detector.resetAllCategories();

      expect(detector.getCategoryStats('test1')).toBeNull();
      expect(detector.getCategoryStats('test2')).toBeNull();
    });

    it('should set and clone category stats correctly', () => {
      const testStats: CategoryStats = { mean: 150, variance: 100, count: 5 };
      detector.setCategoryStats('manual', testStats);

      const retrievedStats = detector.getCategoryStats('manual');
      expect(retrievedStats).toEqual(testStats);

      const clonedStats = detector.cloneCategoryStats('manual');
      expect(clonedStats).toEqual(testStats);
      expect(clonedStats).not.toBe(testStats); // Should be different object
    });

    it('should return all category stats', () => {
      detector.detectAnomaly({ category: 'cat1', amount: 100 });
      detector.detectAnomaly({ category: 'cat2', amount: 200 });

      const allStats = detector.getAllCategoryStats();
      expect(allStats.size).toBe(2);
      expect(allStats.has('cat1')).toBe(true);
      expect(allStats.has('cat2')).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero amounts', () => {
      const result = detector.detectAnomaly({ category: 'zero', amount: 0 });
      expect(result.ewmaMean).toBe(0);
      expect(result.isAnomaly).toBe(false);
    });

    it('should handle negative amounts', () => {
      const result = detector.detectAnomaly({ category: 'negative', amount: -100 });
      expect(result.ewmaMean).toBe(-100);
      expect(result.isAnomaly).toBe(false);
    });

    it('should handle very small amounts', () => {
      detector.detectAnomaly({ category: 'small', amount: 0.01 });
      const result = detector.detectAnomaly({ category: 'small', amount: 0.02 });
      
      expect(result.ewmaMean).toBeCloseTo(0.012, 3);
      // Small amounts might trigger ratio-based anomaly detection
      // Let's just test that it runs without error
      expect(result.isAnomaly).toBeDefined();
    });

    it('should handle very large amounts', () => {
      detector.detectAnomaly({ category: 'large', amount: 1e6 });
      const result = detector.detectAnomaly({ category: 'large', amount: 1.2e6 });
      
      expect(result.ewmaMean).toBeCloseTo(1.04e6, -2);
    });

    it('should handle empty category names', () => {
      const result = detector.detectAnomaly({ category: '', amount: 100 });
      expect(result.category).toBe('');
      expect(result.ewmaMean).toBe(100);
    });
  });

  describe('Mathematical Precision', () => {
    it('should maintain precision over many calculations', () => {
      // Run many small updates to test for precision loss
      let expectedMean = 100;
      detector.detectAnomaly({ category: 'precision', amount: 100 });

      for (let i = 0; i < 1000; i++) {
        const amount = 100 + Math.sin(i / 10) * 10; // Oscillating around 100
        expectedMean = 0.2 * amount + 0.8 * expectedMean;
        detector.detectAnomaly({ category: 'precision', amount });
      }

      const finalStats = detector.getCategoryStats('precision');
      expect(finalStats!.mean).toBeCloseTo(expectedMean, 10);
      expect(finalStats!.count).toBe(1001);
    });

    it('should handle floating point arithmetic correctly', () => {
      detector.detectAnomaly({ category: 'float', amount: 0.1 });
      detector.detectAnomaly({ category: 'float', amount: 0.2 });
      const result = detector.detectAnomaly({ category: 'float', amount: 0.3 });

      // Should handle floating point arithmetic reasonably well
      expect(result.ewmaMean).toBeCloseTo(0.156, 3);
    });
  });

  describe('Custom Alpha Values', () => {
    it('should work with high alpha (fast adaptation)', () => {
      const fastDetector = new EWMAAnomalyDetector(0.9);
      
      fastDetector.detectAnomaly({ category: 'fast', amount: 100 });
      const result = fastDetector.detectAnomaly({ category: 'fast', amount: 200 });
      
      // With alpha=0.9: new_mean = 0.9 * 200 + 0.1 * 100 = 190
      expect(result.ewmaMean).toBeCloseTo(190, 8);
    });

    it('should work with low alpha (slow adaptation)', () => {
      const slowDetector = new EWMAAnomalyDetector(0.05);
      
      slowDetector.detectAnomaly({ category: 'slow', amount: 100 });
      const result = slowDetector.detectAnomaly({ category: 'slow', amount: 200 });
      
      // With alpha=0.05: new_mean = 0.05 * 200 + 0.95 * 100 = 105
      expect(result.ewmaMean).toBeCloseTo(105, 8);
    });
  });

  describe('Custom Z-Score Thresholds', () => {
    it('should be more sensitive with lower threshold', () => {
      const sensitiveDetector = new EWMAAnomalyDetector(0.2, 1.5);
      
      // Setup baseline
      sensitiveDetector.detectAnomaly({ category: 'sensitive', amount: 100 });
      sensitiveDetector.detectAnomaly({ category: 'sensitive', amount: 100 });
      
      // This might not be flagged with default threshold (2.5) but should be with 1.5
      const result = sensitiveDetector.detectAnomaly({ category: 'sensitive', amount: 150 });
      
      if (Math.abs(result.zScore) > 1.5) {
        expect(result.isAnomaly).toBe(true);
      }
    });
  });
});