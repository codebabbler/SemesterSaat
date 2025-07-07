"use client";

import React from "react";
import CustomPieChart from "~/components/Charts/CustomPieChart";
import { formatCurrency } from "~/utils/constants";

interface FinanceOverviewProps {
  totalBalance: number;
  totalIncome: number;
  totalExpense: number;
}

const FinanceOverview: React.FC<FinanceOverviewProps> = ({
  totalBalance,
  totalIncome,
  totalExpense,
}) => {
  const COLORS = ["#875CF5", "#FA2C37", "#FF6900"];

  const balanceData = [
    { name: "Total Balance", amount: totalBalance },
    { name: "Total Expenses", amount: totalExpense },
    { name: "Total Income", amount: totalIncome },
  ];

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h5 className="text-lg">Financial Overview</h5>
      </div>

      <CustomPieChart
        data={balanceData}
        label="Total Balance"
        totalAmount={formatCurrency(totalBalance)}
        colors={COLORS}
        showTextAnchor
      />
    </div>
  );
};

export default FinanceOverview;
