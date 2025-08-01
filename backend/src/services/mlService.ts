import axios, { AxiosResponse } from 'axios';

// ML Service Configuration
const ML_SERVICE_BASE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8080';
const ML_SERVICE_TIMEOUT = 5000; // 5 seconds timeout

// ML Service Types
interface PredictionRequest {
  text: string;
}

interface PredictionResponse {
  category: string;
  confidence: number;
}

interface FeedbackRequest {
  text: string;
  category: string;
}

interface FeedbackResponse {
  message: string;
  category: string;
  feedback_count?: number;
  total_classes?: number;
  classes?: string[];
}

// ML Service Client
class MLService {
  private client = axios.create({
    baseURL: ML_SERVICE_BASE_URL,
    timeout: ML_SERVICE_TIMEOUT,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  /**
   * Predict category from text description
   */
  async predictCategory(text: string): Promise<PredictionResponse> {
    try {
      const response: AxiosResponse<PredictionResponse> = await this.client.post(
        '/predict',
        { text: text.trim() }
      );
      return response.data;
    } catch (error) {
      console.error('ML Service prediction error:', error);
      
      // Return fallback response when ML service is unavailable
      return {
        category: 'Unknown',
        confidence: 0,
      };
    }
  }

  /**
   * Send feedback to improve ML model
   */
  async sendFeedback(text: string, category: string): Promise<FeedbackResponse> {
    try {
      const response: AxiosResponse<FeedbackResponse> = await this.client.post(
        '/feedback',
        { 
          text: text.trim(),
          category: category.trim()
        }
      );
      return response.data;
    } catch (error) {
      console.error('ML Service feedback error:', error);
      
      // Return fallback response
      return {
        message: 'Feedback received but ML service unavailable',
        category,
      };
    }
  }

  /**
   * Check if ML service is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      await this.client.get('/predict', { timeout: 2000 });
      return true;
    } catch (error) {
      console.error('ML Service health check failed:', error);
      return false;
    }
  }

  /**
   * Map predicted categories to standardized categories
   */
  mapToStandardCategory(category: string): string {
    const standardCategories = [
      'Salary',
      'Shopping', 
      'Education',
      'Health',
      'Utilities',
      'Entertainment',
      'Transportation',
      'Food',
      'Unknown'
    ];

    // Direct match
    if (standardCategories.includes(category)) {
      return category;
    }

    // Fuzzy mapping for common variations
    const categoryMappings: Record<string, string> = {
      'Groceries': 'Food',
      'Grocery': 'Food',
      'Restaurant': 'Food',
      'Dining': 'Food',
      'Travel': 'Transportation',
      'Transport': 'Transportation',
      'Car': 'Transportation',
      'Gas': 'Transportation',
      'Fuel': 'Transportation',
      'Medical': 'Health',
      'Doctor': 'Health',
      'Hospital': 'Health',
      'Medicine': 'Health',
      'School': 'Education',
      'Books': 'Education',
      'Course': 'Education',
      'Movie': 'Entertainment',
      'Games': 'Entertainment',
      'Gaming': 'Entertainment',
      'Bills': 'Utilities',
      'Electric': 'Utilities',
      'Water': 'Utilities',
      'Internet': 'Utilities',
      'Phone': 'Utilities',
      'Rent': 'Utilities',
      'Income': 'Salary',
      'Wage': 'Salary',
      'Pay': 'Salary',
      'Freelance': 'Salary',
    };

    // Case-insensitive mapping
    const lowerCategory = category.toLowerCase();
    for (const [key, value] of Object.entries(categoryMappings)) {
      if (lowerCategory.includes(key.toLowerCase())) {
        return value;
      }
    }

    return 'Unknown';
  }
}

// Export singleton instance
export const mlService = new MLService();

// Export types for use in controllers
export type { PredictionResponse, FeedbackResponse };