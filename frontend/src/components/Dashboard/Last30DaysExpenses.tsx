"use client";

import React, { useEffect, useState } from "react";
import CustomBarChart from "~/components/Charts/CustomBarChart";
import { prepareExpenseBarChartData } from "~/utils/helper";

interface ExpenseData {
  category: string;
  amount: number;
}

interface Last30DaysExpensesProps {
  data: ExpenseData[];
}

const Last30DaysExpenses: React.FC<Last30DaysExpensesProps> = ({ data }) => {
  const [chartData, setChartData] = useState<ExpenseData[]>([]);

  useEffect(() => {
   const result = prepareExpenseBarChartData(data);
   setChartData(result);

    return () => {};
  }, [data]);

  return (
    <div className="card col-span-1">
      <div className="flex items-center justify-between ">
        <h5 className="text-lg">Last 30 Days Expenses</h5>
      </div>

      <CustomBarChart data={chartData} />
    </div>
  );
};

export default Last30DaysExpenses;