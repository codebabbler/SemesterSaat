import { Schema, model, Document } from "mongoose";

interface IAnomalyStats extends Document {
  _id: string;
  userId: string;
  category: string;
  transactionType: 'expense' | 'income';
  mean: number;
  variance: number;
  count: number;
  lastUpdated: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface IAnomalyDetection extends Document {
  _id: string;
  userId: string;
  transactionId: string;
  transactionType: 'expense' | 'income';
  category: string;
  amount: number;
  isAnomaly: boolean;
  zScore: number;
  message: string;
  ewmaMean: number;
  ewmaStandardDeviation: number;
  transactionCount: number;
  detectedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const anomalyStatsSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    transactionType: {
      type: String,
      enum: ['expense', 'income'],
      required: true,
    },
    mean: {
      type: Number,
      required: true,
    },
    variance: {
      type: Number,
      required: true,
    },
    count: {
      type: Number,
      required: true,
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

const anomalyDetectionSchema = new Schema(
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
    transactionType: {
      type: String,
      enum: ['expense', 'income'],
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    isAnomaly: {
      type: Boolean,
      required: true,
    },
    zScore: {
      type: Number,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    ewmaMean: {
      type: Number,
      required: true,
    },
    ewmaStandardDeviation: {
      type: Number,
      required: true,
    },
    transactionCount: {
      type: Number,
      required: true,
    },
    detectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create indexes for better query performance
anomalyStatsSchema.index({ userId: 1, category: 1, transactionType: 1 }, { unique: true });
anomalyStatsSchema.index({ userId: 1, lastUpdated: -1 });

anomalyDetectionSchema.index({ userId: 1, detectedAt: -1 });
anomalyDetectionSchema.index({ userId: 1, isAnomaly: 1, detectedAt: -1 });
anomalyDetectionSchema.index({ userId: 1, transactionType: 1, detectedAt: -1 });
anomalyDetectionSchema.index({ transactionId: 1 });

const AnomalyStats = model<IAnomalyStats>("AnomalyStats", anomalyStatsSchema);
const AnomalyDetection = model<IAnomalyDetection>("AnomalyDetection", anomalyDetectionSchema);

export default { AnomalyStats, AnomalyDetection };
export type { IAnomalyStats, IAnomalyDetection };