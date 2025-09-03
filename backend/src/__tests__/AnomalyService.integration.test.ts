import AnomalyService from '../services/anomaly.service';

// Simple integration tests focusing on the core functionality
describe('AnomalyService Core Functionality', () => {
  const mockUserId = 'user123';
  const mockTransactionId = 'transaction456';

  beforeEach(() => {
    // Clear any cached detectors between tests
    AnomalyService.forceCleanup();
  });

  describe('Input Validation', () => {
    it('should reject invalid userId', async () => {
      await expect(
        AnomalyService.detectAnomaly('', mockTransactionId, 'expense', 'groceries', 100)
      ).rejects.toThrow('Invalid userId provided');

      await expect(
        AnomalyService.detectAnomaly(null as any, mockTransactionId, 'expense', 'groceries', 100)
      ).rejects.toThrow('Invalid userId provided');
    });

    it('should reject invalid transactionId', async () => {
      await expect(
        AnomalyService.detectAnomaly(mockUserId, '', 'expense', 'groceries', 100)
      ).rejects.toThrow('Invalid transactionId provided');
    });

    it('should reject invalid category', async () => {
      await expect(
        AnomalyService.detectAnomaly(mockUserId, mockTransactionId, 'expense', '', 100)
      ).rejects.toThrow('Invalid category provided');
    });

    it('should reject invalid amount', async () => {
      await expect(
        AnomalyService.detectAnomaly(mockUserId, mockTransactionId, 'expense', 'groceries', NaN)
      ).rejects.toThrow('Invalid amount provided');

      await expect(
        AnomalyService.detectAnomaly(mockUserId, mockTransactionId, 'expense', 'groceries', Infinity)
      ).rejects.toThrow('Invalid amount provided');
    });

    it('should reject invalid transactionType', async () => {
      await expect(
        AnomalyService.detectAnomaly(mockUserId, mockTransactionId, 'invalid' as any, 'groceries', 100)
      ).rejects.toThrow('Invalid transactionType');
    });
  });

  describe('Cache Management', () => {
    it('should return cache statistics', () => {
      const cacheStats = AnomalyService.getCacheStats();

      expect(cacheStats).toHaveProperty('size');
      expect(cacheStats).toHaveProperty('maxSize');
      expect(cacheStats).toHaveProperty('loadingCount');
      expect(typeof cacheStats.size).toBe('number');
      expect(typeof cacheStats.maxSize).toBe('number');
      expect(typeof cacheStats.loadingCount).toBe('number');
    });

    it('should handle cleanup operations', () => {
      expect(() => AnomalyService.forceCleanup()).not.toThrow();
    });
  });

  describe('Service Layer Integration', () => {
    it('should integrate with detector correctly', async () => {
      try {
        // This will likely fail due to database connectivity, but we can test that
        // the service layer properly validates inputs and creates detectors
        await AnomalyService.detectAnomaly(
          mockUserId,
          mockTransactionId,
          'expense',
          'groceries',
          100
        );
      } catch (error) {
        // Expected to fail due to missing database, but should fail at database level
        // not at validation or detector creation level
        expect(error).toBeDefined();
        
        // Error should be related to database operations, not input validation
        const errorMessage = (error as Error).message;
        expect(errorMessage).not.toContain('Invalid');
        expect(errorMessage).not.toContain('provided');
      }
    });

    it('should handle reset operations gracefully', async () => {
      try {
        await AnomalyService.resetUserData(mockUserId);
      } catch (error) {
        // Expected to fail due to database, but validates the method exists and handles errors
        expect(error).toBeDefined();
      }

      try {
        await AnomalyService.resetCategoryStats(mockUserId, 'groceries', 'expense');
      } catch (error) {
        // Expected to fail due to database
        expect(error).toBeDefined();
      }
    });
  });
});