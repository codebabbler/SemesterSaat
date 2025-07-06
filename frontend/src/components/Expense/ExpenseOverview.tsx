"use client";

import React, { useEffect, useState } from "react";
import { LuPlus } from "react-icons/lu";
import CustomLineChart from "~/components/Charts/CustomLineChart";
import { prepareExpenseLineChartData } from "~/utils/helper";

interface Transaction {
  date: string;
  amount: number;
  category: string;
}

interface ChartData {
  month: string;
  amount: number;
  category: string;
}

interface ExpenseOverviewProps {
  transactions: Transaction[];
  onExpenseIncome: () => void;
}

const ExpenseOverview: React.FC<ExpenseOverviewProps> = ({ 
  transactions, 
  onExpenseIncome 
}) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    const result = prepareExpenseLineChartData(transactions);
    setChartData(result);
  }, [transactions]);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="">
          <h5 className="text-lg">Expense Overview</h5>
          <p className="text-xs text-gray-400 mt-0.5">
            Track your spending trends over time and gain insights into where
            your money goes.
          </p>
        </div>

        <button className="add-btn" onClick={onExpenseIncome}>
          <LuPlus className="text-lg" />
          Add Expense
        </button>
      </div>

      <div className="mt-10">
        <CustomLineChart data={chartData} />
      </div>
    </div>
  );
};

export default ExpenseOverview;