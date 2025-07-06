"use client";

import React, { useEffect, useState } from "react";
import CustomPieChart from "~/components/Charts/CustomPieChart";
import { formatCurrency } from "~/utils/constants";

interface Income {
  _id: string;
  source: string;
  icon?: string;
  date: string;
  amount: number;
}

interface ChartData {
  name: string;
  amount: number;
}

interface RecentIncomeWithChartProps {
  data: Income[];
  totalIncome: number;
}

const RecentIncomeWithChart: React.FC<RecentIncomeWithChartProps> = ({
  data,
  totalIncome,
}) => {
  const [chartData, setChartData] = useState<ChartData[]>([]);

  const prepareChartData = () => {
    const dataArr = data?.map((item) => ({
      name: item?.source,
      amount: item?.amount,
    }));

    setChartData(dataArr);
  };

  useEffect(() => {
    prepareChartData();
  }, [data]);

  const COLORS = ["#875CF5", "#FA2C37", "#FF6900", "#00C49F"];

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h5 className="text-lg">Last 60 Days Income</h5>
      </div>

      <CustomPieChart
        data={chartData}
        label="Total Income"
        totalAmount={formatCurrency(totalIncome)}
        showTextAnchor
        colors={COLORS}
      />
    </div>
  );
};

export default RecentIncomeWithChart;
