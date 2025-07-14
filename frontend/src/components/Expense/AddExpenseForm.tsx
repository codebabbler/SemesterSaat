"use client";

import React, { useState } from "react";
import Input from "~/components/Inputs/Input";
import DatePicker from "~/components/Inputs/DatePicker";
import EmojiPickerPopup from "~/components/EmojiPickerPopup";

interface ExpenseData {
  category: string;
  amount: string;
  date: string;
  icon: string;
  isRecurring: boolean;
  recurringPeriod: "daily" | "weekly" | "monthly" | "yearly" | "";
}

interface AddExpenseFormProps {
  onAddExpense: (expense: ExpenseData) => void;
}

const AddExpenseForm: React.FC<AddExpenseFormProps> = ({ onAddExpense }) => {
  const [expense, setExpense] = useState<ExpenseData>({
    category: "",
    amount: "",
    date: "",
    icon: "",
    isRecurring: false,
    recurringPeriod: "",
  });

  const handleChange = (key: keyof ExpenseData, value: string | boolean) => 
    setExpense({ ...expense, [key]: value });

  return (
    <div>
      <EmojiPickerPopup
        icon={expense.icon}
        onSelect={(selectedIcon) => handleChange("icon", selectedIcon)}
      />

      <Input
        value={expense.category}
        onChange={({ target }) => handleChange("category", target.value)}
        label="Category"
        placeholder="Rent, Groceries, etc"
        type="text"
      />

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

      <div className="mt-4">
        <label className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={expense.isRecurring}
            onChange={(e) => handleChange("isRecurring", e.target.checked)}
            className="form-checkbox h-4 w-4 text-blue-600"
          />
          <span className="text-sm font-medium text-gray-700">Recurring Expense</span>
        </label>
      </div>

      {expense.isRecurring && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Recurring Period
          </label>
          <select
            value={expense.recurringPeriod}
            onChange={(e) => handleChange("recurringPeriod", e.target.value)}
            className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select period</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
            <option value="yearly">Yearly</option>
          </select>
        </div>
      )}

      <div className="flex justify-end mt-6">
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