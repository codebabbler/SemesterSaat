"use client";

import React, { useState, useEffect } from "react";
import Input from "~/components/Inputs/Input";
import DatePicker from "~/components/Inputs/DatePicker";
import { API_PATHS } from "~/utils/apiPaths";
import toast from "react-hot-toast";
import axiosInstance from "~/utils/axiosInstance";
import type { IncomeData, PredictionResult } from "~/types/transaction.types";


interface EditIncomeFormProps {
  income: IncomeData;
  onUpdateIncome: (income: IncomeData) => void;
  onCancel: () => void;
}

const EditIncomeForm: React.FC<EditIncomeFormProps> = ({ 
  income: initialIncome, 
  onUpdateIncome, 
  onCancel 
}) => {
  const [income, setIncome] = useState<IncomeData>(initialIncome);
  const [prediction, setPrediction] = useState<PredictionResult | null>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  const commonIncomeSources = [
    'Salary', 'Freelance', 'Business', 'Investment', 'Rental', 
    'Part-time', 'Commission', 'Bonus', 'Other'
  ];

  useEffect(() => {
    setIncome(initialIncome);
  }, [initialIncome]);

  const handleChange = (key: keyof IncomeData, value: string | boolean) =>
    setIncome({ ...income, [key]: value });

  const predictSource = async (description: string) => {
    if (!description.trim() || description.length < 3) return;

    setIsPredicting(true);
    try {
      const response = await axiosInstance.post(API_PATHS.INCOME.PREDICT_SOURCE, {
        description: description.trim()
      });

      const result: PredictionResult = response.data.data;
      setPrediction(result);

      // Auto-fill source if confidence is high
      if (result.isHighConfidence && result.source !== 'Unknown') {
        handleChange('source', result.source!);
        toast.success(`Source predicted: ${result.source} (${Math.round(result.confidence * 100)}% confidence)`);
      } else {
        // Show feedback option for low confidence predictions
        setShowFeedback(true);
        handleChange('source', result.source!);
        toast(`Low confidence prediction: ${result.source}. Please verify or provide feedback.`, {
          icon: '⚠️',
          duration: 4000
        });
      }
    } catch (error) {
      console.error('Prediction error:', error);
      toast.error('Could not predict source. Please select manually.');
    } finally {
      setIsPredicting(false);
    }
  };

  const sendFeedback = async (correctSource: string) => {
    if (!income.description?.trim() || !correctSource.trim()) return;

    try {
      await axiosInstance.post(API_PATHS.INCOME.FEEDBACK_SOURCE, {
        description: income.description.trim(),
        source: correctSource.trim()
      });

      handleChange('source', correctSource);
      setShowFeedback(false);
      toast.success('Thank you for the feedback! This will help improve predictions.');
    } catch (error) {
      console.error('Feedback error:', error);
      toast.error('Could not send feedback, but your selection has been saved.');
      handleChange('source', correctSource);
      setShowFeedback(false);
    }
  };

  const handleDescriptionBlur = () => {
    if (income.description?.trim() && income.description !== initialIncome.description) {
      predictSource(income.description);
    }
  };

  return (
    <div>
      <div>
        <label className="text-[13px] text-slate-800">Description</label>
        <div className="input-box">
          <input
            type="text"
            placeholder="e.g., monthly salary from company, freelance project payment"
            className="w-full bg-transparent outline-none"
            value={income.description}
            onChange={({ target }) => handleChange("description", target.value)}
            onBlur={handleDescriptionBlur}
          />
        </div>
      </div>

      <div className="relative">
        <Input
          value={income.source}
          onChange={({ target }) => handleChange("source", target.value)}
          label="Income Source"
          placeholder="Source will be predicted automatically"
          type="text"
        />
        {isPredicting && (
          <div className="absolute right-3 top-9 flex items-center">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
            <span className="ml-2 text-xs text-gray-500">Predicting...</span>
          </div>
        )}
        {prediction && prediction.isHighConfidence && (
          <div className="mt-1 text-xs text-green-600">
            ✓ Predicted with {Math.round(prediction.confidence * 100)}% confidence
          </div>
        )}
      </div>

      {showFeedback && prediction && (
        <div className="mt-2 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
          <p className="text-sm text-yellow-800 mb-2">
            Is &quot;{prediction.source}&quot; correct? If not, please select the right source:
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
            <option value="">Select correct source</option>
            {commonIncomeSources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="mt-2 text-xs text-yellow-600 underline"
            onClick={() => setShowFeedback(false)}
          >
            Keep &quot;{prediction.source}&quot; as is
          </button>
        </div>
      )}

      <Input
        value={income.amount.toString()}
        onChange={({ target }) => handleChange("amount", target.value)}
        label="Amount"
        placeholder=""
        type="number"
      />

      <DatePicker
        value={income.date}
        onChange={(date) => handleChange("date", date)}
        label="Date"
        placeholder="Select income date"
      />

      <div className="mt-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={income.isRecurring}
            onChange={(e) => handleChange("isRecurring", e.target.checked)}
            className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">
            Recurring Income
          </span>
        </label>
      </div>

      {income.isRecurring && (
        <div className="mt-4">
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Recurring Period
          </label>
          <select
            value={income.recurringPeriod}
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

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
          onClick={onCancel}
        >
          Cancel
        </button>
        <button
          type="button"
          className="add-btn add-btn-fill"
          onClick={() => onUpdateIncome(income)}
        >
          Update Income
        </button>
      </div>
    </div>
  );
};

export default EditIncomeForm;