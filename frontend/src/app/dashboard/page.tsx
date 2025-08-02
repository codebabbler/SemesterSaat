"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import DashboardLayout from "~/components/Layouts/DashboardLayout";

import { LuHandCoins, LuWalletMinimal } from "react-icons/lu";
import { IoMdCard } from "react-icons/io";

import InfoCard from "~/components/Cards/InfoCard";
import { useUserAuth } from "~/hooks/useUserAuth";
import axiosInstance from "~/utils/axiosInstance";
import { API_PATHS } from "~/utils/apiPaths";
import { addThousandsSeparator } from "~/utils/helper";
import RecentTransactions from "~/components/Dashboard/RecentTransactions";
import FinanceOverview from "~/components/Dashboard/FinanceOverview";
import ExpenseTransactions from "~/components/Dashboard/ExpenseTransactions";
import Last30DaysExpenses from "~/components/Dashboard/Last30DaysExpenses";
import RecentIncome from "~/components/Dashboard/RecentIncome";
import RecentIncomeWithChart from "~/components/Dashboard/RecentIncomeWithChart";

interface DashboardData {
  summary: {
    totalBalance: number;
    totalIncome: number;
    totalExpenses: number;
    savingsRate: number;
  };
  last30Days: {
    total: number;
    count: number;
    average: number;
    transactions: Array<{
      _id: string;
      userId: string;
      icon?: string;
      source: string;
      amount: number;
      date: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  last60Days: {
    total: number;
    count: number;
    average: number;
    transactions: Array<{
      _id: string;
      userId: string;
      icon?: string;
      source: string;
      amount: number;
      date: string;
      createdAt: string;
      updatedAt: string;
    }>;
  };
  recentTransactions: Array<{
    _id: string;
    userId: string;
    icon?: string;
    amount: number;
    date: string;
    createdAt: string;
    updatedAt: string;
    type: "income" | "expense";
    category?: string;
    source?: string;
  }>;
  topExpenseCategories: Array<{
    name: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  topIncomeSource: Array<{
    name: string;
    amount: number;
    percentage: number;
    count: number;
  }>;
  monthlyTrends: Array<{
    year: number;
    month: number;
    income: number;
    expenses: number;
    balance: number;
  }>;
}

const Dashboard = () => {
  useUserAuth();

  const router = useRouter();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const response = await axiosInstance.get<{
        data: DashboardData;
      }>(`${API_PATHS.DASHBOARD.GET_DATA}`);

      if (response.data?.data) {
        setDashboardData(response.data.data);
      }
    } catch (error) {
      console.log("Something went wrong. Please try again.", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchDashboardData();
  }, []);

  useEffect(() => {
    console.log({ dashboardData });
  }, [dashboardData]);

  // Create expense transactions for the ExpenseTransactions component
  const expenseTransactions =
    dashboardData?.recentTransactions
      ?.filter((transaction) => transaction.type === "expense")
      ?.map((transaction) => ({
        _id: transaction._id,
        category: transaction.category ?? "Unknown",
        icon: transaction.icon,
        date: transaction.date,
        amount: transaction.amount,
      })) ?? [];

  // Create expense data for the Last30DaysExpenses component from recent expense transactions
  const expenseData = expenseTransactions ?? [];

  return (
    <DashboardLayout activeMenu="Dashboard">
      <div className="mx-auto my-5">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          <InfoCard
            icon={<IoMdCard />}
            label="Total Balance"
            value={addThousandsSeparator(
              dashboardData?.summary?.totalBalance ?? 0,
            )}
            color="bg-primary"
          />

          <InfoCard
            icon={<LuWalletMinimal />}
            label="Total Income"
            value={addThousandsSeparator(
              dashboardData?.summary?.totalIncome ?? 0,
            )}
            color="bg-orange-500"
          />

          <InfoCard
            icon={<LuHandCoins />}
            label="Total Expenses"
            value={addThousandsSeparator(
              dashboardData?.summary?.totalExpenses ?? 0,
            )}
            color="bg-red-500"
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          <RecentTransactions
            transactions={dashboardData?.recentTransactions ?? []}
            onSeeMore={() => router.push("/expense")}
          />

          <FinanceOverview
            totalBalance={dashboardData?.summary?.totalBalance ?? 0}
            totalIncome={dashboardData?.summary?.totalIncome ?? 0}
            totalExpense={dashboardData?.summary?.totalExpenses ?? 0}
          />

          <ExpenseTransactions
            transactions={expenseTransactions}
            onSeeMore={() => router.push("/expense")}
          />

          <Last30DaysExpenses data={expenseData} />

          <RecentIncomeWithChart
            data={dashboardData?.last60Days?.transactions?.slice(0, 4) ?? []}
            totalIncome={dashboardData?.summary?.totalIncome ?? 0}
          />

          <RecentIncome
            transactions={dashboardData?.last60Days?.transactions ?? []}
            onSeeMore={() => router.push("/income")}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
