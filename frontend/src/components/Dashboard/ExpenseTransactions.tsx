"use client";

import moment from "moment";
import React from "react";
import { LuArrowRight } from "react-icons/lu";
import TransactionInfoCard from "~/components/Cards/TransactionInfoCard";

interface Expense {
  _id: string;
  category: string;
  icon?: string;
  date: string;
  amount: number;
}

interface ExpenseTransactionsProps {
  transactions: Expense[];
  onSeeMore: () => void;
}

const ExpenseTransactions: React.FC<ExpenseTransactionsProps> = ({
  transactions, 
  onSeeMore
}) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between ">
        <h5 className="text-lg">Expenses</h5>

        <button className="card-btn" onClick={onSeeMore}>
          See All <LuArrowRight className="text-base" />
        </button>
      </div>

      <div className="mt-6">
        {transactions?.slice(0,5)?.map((expense) => (
          <TransactionInfoCard
            key={expense._id}
            title={expense.category}
            icon={expense.icon}
            date={moment(expense.date).format("Do MMM YYYY")}
            amount={expense.amount}
            type="expense"
            hideDeleteBtn
          />
        ))}
      </div>
    </div>
  );
};

export default ExpenseTransactions;