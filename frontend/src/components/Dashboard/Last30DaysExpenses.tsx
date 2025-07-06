"use client";

import React, { useEffect, useState } from "react";
import CustomBarChart from "~/components/Charts/CustomBarChart";
import { prepareExpenseBarChartData } from "~/utils/helper";

interface ExpenseData {
  _id: string;
  category: string;
  amount: number;
  date: string;
  icon?: string;
}

interface Last30DaysExpensesProps {
  data: ExpenseData[];
}

const Last30DaysExpenses: React.FC<Last30DaysExpensesProps> = ({ data }) => {
  const [chartData, setChartData] = useState<
    { month: string; amount: number }[]
  >([]);

  useEffect(() => {
    const result = prepareExpenseBarChartData(data);
    setChartData(result);
  }, [data]);

  return (
    <div className="card col-span-1">
      <div className="flex items-center justify-between">
        <h5 className="text-lg">Last 30 Days Expenses</h5>
      </div>

      {chartData.length > 0 ? (
        <CustomBarChart data={chartData} />
      ) : (
        <div className="mt-6 flex h-[300px] items-center justify-center text-gray-500">
          No expense data available
        </div>
      )}
    </div>
  );
};

export default Last30DaysExpenses;
