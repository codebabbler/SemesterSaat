import { Schema, model, Document } from "mongoose";

// Income interface
interface IIncome extends Document {
  _id: string;
  userId: string;
  icon?: string;
  source: string;
  amount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const incomeSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    icon: {
      type: String,
    },
    source: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Create indexes for better query performance
incomeSchema.index({ userId: 1, date: -1 }); // Most common: user-specific date-sorted queries
incomeSchema.index({ userId: 1, source: 1 }); // For category analytics and filtering
incomeSchema.index({ userId: 1, amount: -1 }); // For amount-based analytics
incomeSchema.index({ date: -1 }); // For global date sorting (admin queries)

const Income = model<IIncome>("Income", incomeSchema);

export default Income;
export type { IIncome };
