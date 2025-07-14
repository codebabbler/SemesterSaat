import { Schema, model, Document, Model, Types } from "mongoose";

// Instance methods interface
interface IAnomalyAlertMethods {
  resolve(resolvedBy?: string): Promise<this>;
  unresolve(): Promise<this>;
}

// Static methods interface
interface IAnomalyAlertStatics {
  findUnresolvedByUser(userId: string): Promise<IAnomalyAlert[]>;
  findBySeverity(userId: string, severity: string): Promise<IAnomalyAlert[]>;
  getStatistics(userId: string): Promise<{
    totalAnomalies: number;
    criticalAnomalies: number;
    warningAnomalies: number;
    unresolvedAnomalies: number;
    avgZScore: number;
    mostAnomalousCategory: {
      name: string;
      count: number;
    } | null;
  }>;
}

// Anomaly Alert interface
interface IAnomalyAlert extends Document, IAnomalyAlertMethods {
  _id: string;
  userId: string;
  transactionId: string;
  type: 'expense' | 'income';
  amount: number;
  category?: string;
  source?: string;
  date: Date;
  zScore: number;
  severity: 'critical' | 'warning' | 'info';
  confidence: 'high' | 'medium' | 'low';
  message: string;
  isResolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Model interface
interface IAnomalyAlertModel extends Model<IAnomalyAlert>, IAnomalyAlertStatics {}

const anomalyAlertSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    transactionId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    type: {
      type: String,
      enum: ['expense', 'income'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      // Required for expense transactions, optional for income
    },
    source: {
      type: String,
      // Required for income transactions, optional for expense
    },
    date: {
      type: Date,
      required: true,
    },
    zScore: {
      type: Number,
      required: true,
    },
    severity: {
      type: String,
      enum: ['critical', 'warning', 'info'],
      required: true,
      default: 'info',
    },
    confidence: {
      type: String,
      enum: ['high', 'medium', 'low'],
      required: true,
      default: 'low',
    },
    message: {
      type: String,
      required: true,
    },
    isResolved: {
      type: Boolean,
      default: false,
    },
    resolvedAt: {
      type: Date,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { 
    timestamps: true,
    // Add a compound index for efficient queries
    indexes: [
      { userId: 1, createdAt: -1 }, // Most common: user-specific date-sorted queries
      { userId: 1, isResolved: 1 }, // For filtering resolved/unresolved alerts
      { userId: 1, severity: 1 }, // For severity-based filtering
      { transactionId: 1 }, // For finding alerts by transaction
      { userId: 1, type: 1, category: 1 }, // For category-based analysis
      { userId: 1, type: 1, source: 1 }, // For source-based analysis
    ]
  }
);

// Add custom validation
anomalyAlertSchema.pre('save', function(next) {
  // Validate that expense transactions have category and income transactions have source
  if (this.type === 'expense' && !this.category) {
    return next(new Error('Category is required for expense anomaly alerts'));
  }
  if (this.type === 'income' && !this.source) {
    return next(new Error('Source is required for income anomaly alerts'));
  }
  next();
});

// Add instance methods
anomalyAlertSchema.methods.resolve = function(resolvedBy?: string) {
  this.isResolved = true;
  this.resolvedAt = new Date();
  if (resolvedBy) {
    this.resolvedBy = resolvedBy;
  }
  return this.save();
};

anomalyAlertSchema.methods.unresolve = function() {
  this.isResolved = false;
  this.resolvedAt = undefined;
  this.resolvedBy = undefined;
  return this.save();
};

// Add static methods for common queries
anomalyAlertSchema.statics.findUnresolvedByUser = function(userId: string) {
  return this.find({ userId, isResolved: false }).sort({ createdAt: -1 });
};

anomalyAlertSchema.statics.findBySeverity = function(userId: string, severity: string) {
  return this.find({ userId, severity }).sort({ createdAt: -1 });
};

anomalyAlertSchema.statics.getStatistics = async function(userId: string) {
  const stats = await this.aggregate([
    { $match: { userId: new Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        totalAnomalies: { $sum: 1 },
        criticalAnomalies: {
          $sum: { $cond: [{ $eq: ['$severity', 'critical'] }, 1, 0] }
        },
        warningAnomalies: {
          $sum: { $cond: [{ $eq: ['$severity', 'warning'] }, 1, 0] }
        },
        unresolvedAnomalies: {
          $sum: { $cond: [{ $eq: ['$isResolved', false] }, 1, 0] }
        },
        avgZScore: { $avg: { $abs: '$zScore' } }
      }
    }
  ]);

  // Get most anomalous category
  const categoryStats = await this.aggregate([
    { $match: { userId: new Types.ObjectId(userId), category: { $exists: true } } },
    { $group: { _id: '$category', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 1 }
  ]);

  return {
    ...(stats[0] || {
      totalAnomalies: 0,
      criticalAnomalies: 0,
      warningAnomalies: 0,
      unresolvedAnomalies: 0,
      avgZScore: 0
    }),
    mostAnomalousCategory: categoryStats[0] ? {
      name: categoryStats[0]._id,
      count: categoryStats[0].count
    } : null
  };
};

const AnomalyAlert = model<IAnomalyAlert, IAnomalyAlertModel>("AnomalyAlert", anomalyAlertSchema);

export default AnomalyAlert;
export type { IAnomalyAlert };