"use client";

import React, { useEffect, useState } from "react";
import { LuPlus } from "react-icons/lu";
import CustomBarChart from "~/components/Charts/CustomBarChart";
import { prepareIncomeBarChartData } from "~/utils/helper";

interface Transaction {
  _id: string;
  source: string;
  amount: number;
  date: string;
  icon?: string;
}

interface ChartData {
  month: string;
  amount: number;
  source: string;
}

interface IncomeOverviewProps {
  transactions: Transaction[];
  onAddIncome: () => void;
}

const IncomeOverview: React.FC<IncomeOverviewProps> = ({ 
  transactions, 
  onAddIncome 
}) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    const result = prepareIncomeBarChartData(transactions);
    setChartData(result);
  }, [transactions]);

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <div className="">
          <h5 className="text-lg">Income Overview</h5>
          <p className="text-xs text-gray-400 mt-0.5">
            Track your earnings over time and analyze your income trends.
          </p>
        </div>

        <button className="add-btn" onClick={onAddIncome}>
          <LuPlus className="text-lg" />
          Add Income
        </button>
      </div>

      <div className="mt-10">
        <CustomBarChart data={chartData} />
      </div>
    </div>
  );
};

export default IncomeOverview;