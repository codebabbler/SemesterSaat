"use client";
import React, { useState } from "react";
import Input from "~/components/Inputs/Input";
import DatePicker from "~/components/Inputs/DatePicker";
import { API_PATHS } from "~/utils/apiPaths";
import toast from "react-hot-toast";
import axiosInstance from "~/utils/axiosInstance";
import type {
  ExpenseFormData,
  PredictionResult,
} from "~/types/transaction.types";

interface AddExpenseFormProps {
  onAddExpense: (expense: ExpenseFormData) => void;
}

const AddExpenseForm: React.FC<AddExpenseFormProps> = ({ onAddExpense }) => {
  const [expense, setExpense] = useState<ExpenseFormData>({
    description: "",
    category: "",
    amount: "",
    date: "",
    icon: "",
    isRecurring: false,
    recurringPeriod: "",
  });

  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const standardCategories = [
    "Salary",
    "Shopping",
    "Education",
    "Health",
    "Utilities",
    "Entertainment",
    "Transportation",
    "Food",
    "Unknown",
  ];

  const handleChange = (key: keyof ExpenseFormData, value: string | boolean) =>
    setExpense({ ...expense, [key]: value });

  const predictCategory = async (description: string) => {
    if (!description.trim() || description.length < 3) return;

    setIsPredicting(true);
    try {
      const response = await axiosInstance.post(
        API_PATHS.EXPENSE.PREDICT_CATEGORY,
        {
          description: description.trim(),
        },
      );

      const result: PredictionResult = response.data.data;
      setPrediction(result);

      if (result.isHighConfidence && result.category !== "Unknown") {
        handleChange("category", result.category!);
        toast.success(
          `Category predicted: ${result.category} (${Math.round(result.confidence * 100)}% confidence)`,
        );
      } else {
        setShowFeedback(true);
        handleChange("category", result.category!);
        toast(
          `Low confidence prediction: ${result.category}. Please verify or provide feedback.`,
          {
            icon: "⚠️",
            duration: 4000,
          },
        );
      }
    } catch (error) {
      console.error("Prediction error:", error);
      toast.error("Could not predict category. Please select manually.");
    } finally {
      setIsPredicting(false);
    }
  };

  const sendFeedback = async (correctCategory: string) => {
    if (!expense.description?.trim() || !correctCategory.trim()) return;

    try {
      await axiosInstance.post(API_PATHS.EXPENSE.FEEDBACK_CATEGORY, {
        description: expense.description.trim(),
        category: correctCategory.trim(),
      });

      handleChange("category", correctCategory);
      setShowFeedback(false);
      toast.success(
        "Thank you for the feedback! This will help improve predictions.",
      );
    } catch (error) {
      console.error("Feedback error:", error);
      toast.error(
        "Could not send feedback, but your selection has been saved.",
      );
      handleChange("category", correctCategory);
      setShowFeedback(false);
    }
  };

  const handleDescriptionBlur = () => {
    if (expense.description?.trim()) {
      predictCategory(expense.description);
    }
  };

  return (
    <div>
      <Input
        value={expense.amount}
        onChange={({ target }) => handleChange("amount", target.value)}
        label="Amount"
        placeholder=""
        type="number"
      />

      <DatePicker
        value={expense.date}
        onChange={(date) => handleChange("date", date)}
        label="Date"
        placeholder="Select expense date"
      />

      <div>
        <label className="text-[13px] text-slate-800">Description</label>
        <div className="input-box">
          <input
            type="text"
            placeholder="e.g., bought groceries from supermarket, paid electricity bill"
            className="w-full bg-transparent outline-none"
            value={expense.description}
            onChange={({ target }) => handleChange("description", target.value)}
            onBlur={handleDescriptionBlur}
          />
        </div>
      </div>

      <div className="relative">
        <Input
          value={expense.category}
          onChange={({ target }) => handleChange("category", target.value)}
          label="Category"
          placeholder="Category will be predicted automatically"
          type="text"
        />
        {isPredicting && (
          <div className="absolute top-9 right-3 flex items-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            <span className="ml-2 text-xs text-gray-500">Predicting...</span>
          </div>
        )}
        {prediction && prediction.isHighConfidence && (
          <div className="mt-1 text-xs text-green-600">
            ✓ Predicted with {Math.round(prediction.confidence * 100)}%
            confidence
          </div>
        )}
      </div>

      {showFeedback && prediction && (
        <div className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <p className="mb-2 text-sm text-yellow-800">
            Is &quot;{prediction.category}&quot; correct? If not, please select
            the right category:
          </p>
          <select
            className="w-full rounded border border-yellow-300 px-2 py-1 text-sm"
            onChange={(e) => {
              if (e.target.value) {
                void sendFeedback(e.target.value);
              }
            }}
            defaultValue=""
          >
            <option value="">Select correct category</option>
            {standardCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="mt-2 text-xs text-yellow-600 underline"
            onClick={() => setShowFeedback(false)}
          >
            Keep &quot;{prediction.category}&quot; as is
          </button>
        </div>
      )}

      <div className="mt-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={expense.isRecurring}
            onChange={(e) => handleChange("isRecurring", e.target.checked)}
            className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">
            Recurring Expense
          </span>
        </label>
      </div>

      {expense.isRecurring && (
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Recurring Period
          </label>
          <select
            value={expense.recurringPeriod}
            onChange={(e) => handleChange("recurringPeriod", e.target.value)}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
          >
            <option value="">Select period</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      )}

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="add-btn add-btn-fill"
          onClick={() => onAddExpense(expense)}
        >
          Add Expense
        </button>
      </div>
    </div>
  );
};

export default AddExpenseForm;
