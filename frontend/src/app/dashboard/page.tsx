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
  totalBalance: number;
  totalIncome: number;
  totalExpenses: number;
  recentTransactions: Array<{
    _id: string;
    type: "income" | "expense";
    category?: string;
    source?: string;
    icon?: string;
    date: string;
    amount: number;
  }>;
  last30DaysExpenses: {
    transactions: Array<{
      _id: string;
      category: string;
      icon?: string;
      date: string;
      amount: number;
    }>;
  };
  last60DaysIncome: {
    transactions: Array<{
      _id: string;
      source: string;
      icon?: string;
      date: string;
      amount: number;
    }>;
  };
}

const Dashboard = () => {
  useUserAuth();

  const router = useRouter();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDashboardData = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const response = await axiosInstance.get(
        `${API_PATHS.DASHBOARD.GET_DATA}`
      );

      if (response.data) {
        setDashboardData(response.data as DashboardData);
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

  return (
    <DashboardLayout activeMenu="Dashboard">
      <div className="my-5 mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoCard
            icon={<IoMdCard />}
            label="Total Balance"
            value={addThousandsSeparator(dashboardData?.totalBalance ?? 0)}
            color="bg-primary"
          />

          <InfoCard
            icon={<LuWalletMinimal />}
            label="Total Income"
            value={addThousandsSeparator(dashboardData?.totalIncome ?? 0)}
            color="bg-orange-500"
          />

          <InfoCard
            icon={<LuHandCoins />}
            label="Total Expenses"
            value={addThousandsSeparator(dashboardData?.totalExpenses ?? 0)}
            color="bg-red-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
          <RecentTransactions
            transactions={dashboardData?.recentTransactions ?? []}
            onSeeMore={() => router.push("/expense")}
          />

          <FinanceOverview
            totalBalance={dashboardData?.totalBalance ?? 0}
            totalIncome={dashboardData?.totalIncome ?? 0}
            totalExpense={dashboardData?.totalExpenses ?? 0}
          />

          <ExpenseTransactions
            transactions={dashboardData?.last30DaysExpenses?.transactions ?? []}
            onSeeMore={() => router.push("/expense")}
          />

          <Last30DaysExpenses
            data={dashboardData?.last30DaysExpenses?.transactions ?? []}
          />

          <RecentIncomeWithChart
            data={dashboardData?.last60DaysIncome?.transactions?.slice(0,4) ?? []}
            totalIncome={dashboardData?.totalIncome ?? 0}
          />

          <RecentIncome
            transactions={dashboardData?.last60DaysIncome?.transactions ?? []}
            onSeeMore={() => router.push("/income")}
          />
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;