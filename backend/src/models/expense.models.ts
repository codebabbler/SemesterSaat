import { Schema, model, Document } from "mongoose";

// Expense interface
interface IExpense extends Document {
  _id: string;
  userId: string;
  icon?: string;
  category: string;
  amount: number;
  date: Date;
  createdAt: Date;
  updatedAt: Date;
}

const expenseSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    icon: {
      type: String,
    },
    category: {
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
expenseSchema.index({ userId: 1, date: -1 }); // Most common: user-specific date-sorted queries
expenseSchema.index({ userId: 1, category: 1 }); // For category analytics and filtering
expenseSchema.index({ userId: 1, amount: -1 }); // For amount-based analytics
expenseSchema.index({ date: -1 }); // For global date sorting (admin queries)

const Expense = model<IExpense>("Expense", expenseSchema);

export default Expense;
export type { IExpense };
