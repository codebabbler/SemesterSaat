"use client";

import React, { useState } from "react";
import Input from "~/components/Inputs/Input";
import DatePicker from "~/components/Inputs/DatePicker";

interface IncomeData {
  source: string;
  amount: string;
  date: string;
  icon: string;
  isRecurring: boolean;
  recurringPeriod: "daily" | "weekly" | "monthly" | "yearly" | "";
}

interface AddIncomeFormProps {
  onAddIncome: (income: IncomeData) => void;
}

const AddIncomeForm: React.FC<AddIncomeFormProps> = ({ onAddIncome }) => {
  const [income, setIncome] = useState<IncomeData>({
    source: "",
    amount: "",
    date: "",
    icon: "",
    isRecurring: false,
    recurringPeriod: "",
  });

  const handleChange = (key: keyof IncomeData, value: string | boolean) =>
    setIncome({ ...income, [key]: value });

  return (
    <div>
      <Input
        value={income.source}
        onChange={({ target }) => handleChange("source", target.value)}
        label="Income Source"
        placeholder="Freelance, Salary, etc"
        type="text"
      />

      <Input
        value={income.amount}
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

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          className="add-btn add-btn-fill"
          onClick={() => onAddIncome(income)}
        >
          Add Income
        </button>
      </div>
    </div>
  );
};

export default AddIncomeForm;
