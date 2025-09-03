"use client";

import React from "react";
import TransactionInfoCard from "~/components/Cards/TransactionInfoCard";
import moment from "moment";
import { LuDownload } from "react-icons/lu";
import type { ExpenseData, AnomalyTransaction } from "~/types/transaction.types";

interface ExpenseListProps {
  transactions: ExpenseData[];
  anomalyTransactions: AnomalyTransaction[];
  onDelete: (id: string) => void;
  onEdit: (transaction: ExpenseData) => void;
  onToggleRecurring: (id: string) => void;
  onDownload: () => void;
}

const ExpenseList: React.FC<ExpenseListProps> = ({ 
  transactions, 
  anomalyTransactions,
  onDelete, 
  onEdit,
  onToggleRecurring,
  onDownload 
}) => {
  // Helper function to check if a transaction is anomalous
  const isTransactionAnomalous = (transactionId: string): AnomalyTransaction | undefined => {
    if (!Array.isArray(anomalyTransactions)) return undefined;
    return anomalyTransactions.find(anomaly => anomaly.transactionId === transactionId);
  };
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h5 className="text-lg">All Expenses</h5>

        <button className="card-btn" onClick={onDownload}>
          <LuDownload className="text-base" /> Download
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {transactions?.map((expense) => {
          const anomalyData = isTransactionAnomalous(expense._id);
          return (
            <TransactionInfoCard
              key={expense._id}
              title={expense.description ?? expense.category}
              badge={expense.category}
              icon={expense.icon}
              date={moment(expense.date).format("Do MMM YYYY")}
              amount={expense.amount}
              type="expense"
              onDelete={() => onDelete(expense.originalId ?? expense._id)}
              onEdit={() => onEdit(expense)}
              onToggleRecurring={() => onToggleRecurring(expense.originalId ?? expense._id)}
              isRecurring={expense.isRecurring}
              recurringPeriod={expense.recurringPeriod}
              isVirtual={expense.isVirtual}
              hideDeleteBtn={expense.isVirtual}
              anomalyData={anomalyData}
            />
          );
        })}
      </div>
    </div>
  );
};

export default ExpenseList;