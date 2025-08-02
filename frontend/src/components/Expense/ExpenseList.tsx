"use client";

import React from "react";
import TransactionInfoCard from "~/components/Cards/TransactionInfoCard";
import moment from "moment";
import { LuDownload } from "react-icons/lu";

interface Transaction {
  _id: string;
  description?: string;
  category: string;
  icon?: string;
  date: string;
  amount: number;
  isRecurring?: boolean;
  recurringPeriod?: "daily" | "weekly" | "monthly" | "yearly";
  isVirtual?: boolean;
  originalId?: string;
}

interface ExpenseListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onDownload: () => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ 
  transactions, 
  onDelete, 
  onDownload 
}) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h5 className="text-lg">All Expenses</h5>

        <button className="card-btn" onClick={onDownload}>
          <LuDownload className="text-base" /> Download
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {transactions?.map((expense) => (
          <TransactionInfoCard
            key={expense._id}
            title={expense.description || expense.category}
            badge={expense.category}
            icon={expense.icon}
            date={moment(expense.date).format("Do MMM YYYY")}
            amount={expense.amount}
            type="expense"
            onDelete={() => onDelete(expense.originalId ?? expense._id)}
            isRecurring={expense.isRecurring}
            recurringPeriod={expense.recurringPeriod}
            isVirtual={expense.isVirtual}
            hideDeleteBtn={expense.isVirtual}
          />
        ))}
      </div>
    </div>
  );
};

export default ExpenseList;