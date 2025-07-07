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
  });

  const handleChange = (key: keyof ExpenseData, value: string) => 
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