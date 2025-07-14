"use client";

import React from "react";
import TransactionInfoCard from "~/components/Cards/TransactionInfoCard";
import moment from "moment";
import { LuDownload } from "react-icons/lu";

interface Transaction {
  _id: string;
  source: string;
  icon?: string;
  date: string;
  amount: number;
  isRecurring?: boolean;
  recurringPeriod?: "daily" | "weekly" | "monthly" | "yearly";
  isVirtual?: boolean;
  originalId?: string;
}

interface IncomeListProps {
  transactions: Transaction[];
  onDelete: (id: string) => void;
  onDownload: () => void;
}

const IncomeList: React.FC<IncomeListProps> = ({ 
  transactions, 
  onDelete, 
  onDownload 
}) => {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h5 className="text-lg">Income Sources</h5>

        <button className="card-btn" onClick={onDownload}>
          <LuDownload className="text-base" /> Download
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2">
        {transactions?.map((income) => (
          <TransactionInfoCard
            key={income._id}
            title={income.source}
            icon={income.icon}
            date={moment(income.date).format("Do MMM YYYY")}
            amount={income.amount}
            type="income"
            onDelete={() => onDelete(income.originalId ?? income._id)}
            isRecurring={income.isRecurring}
            recurringPeriod={income.recurringPeriod}
            isVirtual={income.isVirtual}
            hideDeleteBtn={income.isVirtual}
          />
        ))}
      </div>
    </div>
  );
};

export default IncomeList;