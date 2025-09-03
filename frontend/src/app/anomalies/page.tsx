"use client";

import React, { useCallback, useEffect, useState } from "react";
import DashboardLayout from "~/components/Layouts/DashboardLayout";
import { useUserAuth } from "~/hooks/useUserAuth";
import axiosInstance from "~/utils/axiosInstance";
import { API_PATHS } from "~/utils/apiPaths";
import toast from "react-hot-toast";
import { LuShieldAlert, LuRefreshCw } from "react-icons/lu";
import type { AnomalyTransaction } from "~/types/transaction.types";

interface AnomalySummary {
  totalAnomalies: number;
  categoriesAffected: string[];
  severityBreakdown: {
    high: number;
    medium: number;
    low: number;
  };
}

type CategoryAnomalies = Record<
  string,
  {
    count: number;
    transactions: AnomalyTransaction[];
    latestDate: string;
  }
>;

const Anomalies = () => {
  useUserAuth();

  const [anomalyTransactions, setAnomalyTransactions] = useState<
    AnomalyTransaction[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [resettingCategory, setResettingCategory] = useState<string | null>(
    null,
  );
  const [summary, setSummary] = useState<AnomalySummary>({
    totalAnomalies: 0,
    categoriesAffected: [],
    severityBreakdown: { high: 0, medium: 0, low: 0 },
  });
  const [categoryAnomalies, setCategoryAnomalies] = useState<CategoryAnomalies>(
    {},
  );

  // Fetch anomaly transactions
  const fetchAnomalyTransactions = useCallback(async () => {
    setLoading(true);
    try {
      const response = await axiosInstance.get(
        API_PATHS.ANOMALY.GET_TRANSACTIONS,
      );
      if (response.data?.data?.anomalies) {
        const anomalies = response.data.data.anomalies as AnomalyTransaction[];
        setAnomalyTransactions(anomalies);
        processAnomalyData(anomalies);
      }
    } catch (error) {
      console.error("Failed to fetch anomaly transactions:", error);
      toast.error("Failed to load anomaly data");
    } finally {
      setLoading(false);
    }
  }, []);

  // Process anomaly data for summary and grouping
  const processAnomalyData = (anomalies: AnomalyTransaction[]) => {
    const categoriesMap: CategoryAnomalies = {};
    let high = 0,
      medium = 0,
      low = 0;

    anomalies.forEach((anomaly) => {
      // Group by category
      categoriesMap[anomaly.category] ??= {
        count: 0,
        transactions: [],
        latestDate: anomaly.createdAt,
      };

      const categoryData = categoriesMap[anomaly.category]!;
      categoryData.count++;
      categoryData.transactions.push(anomaly);

      // Update latest date if this transaction is more recent
      if (new Date(anomaly.createdAt) > new Date(categoryData.latestDate)) {
        categoryData.latestDate = anomaly.createdAt;
      }

      // Count severity levels
      const absZScore = Math.abs(anomaly.zScore);
      if (absZScore >= 3) high++;
      else if (absZScore >= 2) medium++;
      else low++;
    });

    setCategoryAnomalies(categoriesMap);
    setSummary({
      totalAnomalies: anomalies.length,
      categoriesAffected: Object.keys(categoriesMap),
      severityBreakdown: { high, medium, low },
    });
  };

  // Reset anomalies for a category
  const handleResetCategory = async (category: string) => {
    if (
      !confirm(
        `Are you sure you want to reset all anomalies for the "${category}" category? This action cannot be undone.`,
      )
    ) {
      return;
    }

    setResettingCategory(category);
    try {
      await axiosInstance.post(API_PATHS.ANOMALY.RESET_CATEGORY, {
        category,
        transactionType: "expense",
      });

      toast.success(`Anomalies reset for ${category} category`);
      await fetchAnomalyTransactions(); // Refresh data
    } catch (error: any) {
      console.error("Failed to reset category anomalies:", error);
      toast.error(error.response?.data?.message ?? "Failed to reset anomalies");
    } finally {
      setResettingCategory(null);
    }
  };

  // Get severity color and label
  const getSeverityInfo = (zScore: number) => {
    const absZScore = Math.abs(zScore);
    if (absZScore >= 3)
      return { label: "High", color: "bg-red-100 text-red-800" };
    if (absZScore >= 2)
      return { label: "Medium", color: "bg-orange-100 text-orange-800" };
    return { label: "Low", color: "bg-yellow-100 text-yellow-800" };
  };

  useEffect(() => {
    void fetchAnomalyTransactions();
  }, [fetchAnomalyTransactions]);

  return (
    <DashboardLayout activeMenu="Anomalies">
      <div className="mx-auto my-5">
        <div className="grid grid-cols-1 gap-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="flex items-center gap-3 text-2xl font-bold text-gray-800">
              <LuShieldAlert className="text-orange-600" />
              Anomalies Management
            </h1>
            <button
              onClick={() => fetchAnomalyTransactions()}
              disabled={loading}
              className="flex items-center gap-2 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:opacity-50"
            >
              <LuRefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Total Anomalies
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {summary.totalAnomalies}
                  </p>
                </div>
                <LuShieldAlert className="h-8 w-8 text-orange-600" />
              </div>
            </div>

            <div className="card">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Categories Affected
                </p>
                <p className="text-2xl font-bold text-gray-900">
                  {summary.categoriesAffected.length}
                </p>
              </div>
            </div>

            <div className="card">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  High Severity
                </p>
                <p className="text-2xl font-bold text-red-600">
                  {summary.severityBreakdown.high}
                </p>
              </div>
            </div>

            <div className="card">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Medium + Low
                </p>
                <p className="text-2xl font-bold text-orange-600">
                  {summary.severityBreakdown.medium +
                    summary.severityBreakdown.low}
                </p>
              </div>
            </div>
          </div>

          {/* Category Overview */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              Categories Overview
            </h2>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <LuRefreshCw className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-gray-500">Loading anomalies...</span>
              </div>
            ) : Object.keys(categoryAnomalies).length === 0 ? (
              <div className="py-8 text-center">
                <LuShieldAlert className="mx-auto mb-4 h-12 w-12 text-gray-300" />
                <p className="text-gray-500">No anomalies detected</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {Object.entries(categoryAnomalies).map(([category, data]) => (
                  <div
                    key={category}
                    className="rounded-lg border p-4 hover:bg-gray-50"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">{category}</h3>
                      <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-medium text-orange-800">
                        {data.count} anomalies
                      </span>
                    </div>

                    <div className="mb-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Latest:</span>
                        <span className="text-gray-900">
                          {new Date(data.latestDate).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {data.transactions
                          .slice(0, 3)
                          .map((transaction, index) => {
                            const severity = getSeverityInfo(
                              transaction.zScore,
                            );
                            return (
                              <span
                                key={index}
                                className={`rounded px-2 py-1 text-xs ${severity.color}`}
                              >
                                {severity.label}
                              </span>
                            );
                          })}
                        {data.transactions.length > 3 && (
                          <span className="text-xs text-gray-500">
                            +{data.transactions.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleResetCategory(category)}
                      disabled={resettingCategory === category}
                      className="w-full rounded-md bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {resettingCategory === category ? (
                        <span className="flex items-center justify-center gap-2">
                          <LuRefreshCw className="h-4 w-4 animate-spin" />
                          Resetting...
                        </span>
                      ) : (
                        "Reset Anomalies"
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Detailed Transactions List */}
          <div className="card">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">
              All Anomalous Transactions
            </h2>
            {anomalyTransactions.length === 0 ? (
              <div className="py-8 text-center text-gray-500">
                No anomalous transactions found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Category
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Severity
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Z-Score
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Message
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {anomalyTransactions.map((anomaly) => {
                      const severity = getSeverityInfo(anomaly.zScore);
                      return (
                        <tr key={anomaly._id} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(anomaly.createdAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {anomaly.category}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">
                            NPR {anomaly.amount.toLocaleString()}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded px-2 py-1 text-xs ${severity.color}`}
                            >
                              {severity.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {anomaly.zScore.toFixed(2)}
                          </td>
                          <td 
                          title={anomaly.message}
                          className="max-w-xs  px-4 py-3 text-sm text-gray-600">
                            {anomaly.message}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Anomalies;
