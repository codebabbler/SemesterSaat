"use client";

import React, { useCallback, useEffect, useState } from "react";
import DashboardLayout from "~/components/Layouts/DashboardLayout";
import { useUserAuth } from "~/hooks/useUserAuth";
import axiosInstance from "~/utils/axiosInstance";
import { API_PATHS } from "~/utils/apiPaths";
import ExpenseOverview from "~/components/Expense/ExpenseOverview";
import ExpenseList from "~/components/Expense/ExpenseList";
import AddExpenseForm from "~/components/Expense/AddExpenseForm";
import EditExpenseForm from "~/components/Expense/EditExpenseForm";
import DeleteAlert from "~/components/DeleteAlert";
import Modal from "~/components/Modal";
import toast from "react-hot-toast";
import AnomalyDetectionPopup from "~/components/Anomaly/AnomalyDetectionPopup";
import type {
  ExpenseData,
  ExpenseFormData,
  AnomalyDetection,
  AnomalyTransaction,
} from "~/types/transaction.types";

const Expense = () => {
  useUserAuth();

  const [expenseData, setExpenseData] = useState<ExpenseData[]>([]);
  const [loading, setLoading] = useState(false);

  const [openAddExpenseModal, setOpenAddExpenseModal] = useState(false);
  const [openEditExpenseModal, setOpenEditExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseData | null>(
    null,
  );
  const [openDeleteAlert, setOpenDeleteAlert] = useState<{
    show: boolean;
    data: string | null;
  }>({
    show: false,
    data: null,
  });

  const [anomalyDetectionState, setAnomalyDetectionState] = useState<{
    show: boolean;
    data: AnomalyDetection | null;
    pendingExpense: ExpenseFormData | null;
  }>({
    show: false,
    data: null,
    pendingExpense: null,
  });

  const [anomalyTransactions, setAnomalyTransactions] = useState<
    AnomalyTransaction[]
  >([]);

  // Get Anomaly Transactions
  const fetchAnomalyTransactions = useCallback(async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.ANOMALY.GET_TRANSACTIONS,
      );
      if (response.data?.data) {
        setAnomalyTransactions(
          response.data.data.anomalies as AnomalyTransaction[],
        );
      }
    } catch (error) {
      console.log("Failed to fetch anomaly transactions:", error);
    }
  }, []);

  // Get All Expense Details
  const fetchExpenseDetails = useCallback(async () => {
    if (loading) return;

    setLoading(true);

    try {
      const response = await axiosInstance.get(
        `${API_PATHS.EXPENSE.GET_ALL_EXPENSE}`,
      );

      if (response.data?.data?.expenses) {
        setExpenseData(response.data.data.expenses as ExpenseData[]);
      }
    } catch (error) {
      console.log("Something went wrong. Please try again.", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle Add Expense
  const handleAddExpense = async (expense: ExpenseFormData) => {
    const {
      category,
      amount,
      date,
      icon,
      isRecurring,
      recurringPeriod,
      description,
    } = expense;

    // Validation Checks
    if (!category.trim()) {
      toast.error("Category is required.");
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Amount should be a valid number greater than 0.");
      return;
    }

    if (!date) {
      toast.error("Date is required.");
      return;
    }

    if (isRecurring && !recurringPeriod) {
      toast.error("Recurring period is required for recurring expenses.");
      return;
    }

    try {
      const response = await axiosInstance.post(API_PATHS.EXPENSE.ADD_EXPENSE, {
        category,
        amount: Number(amount),
        date,
        icon,
        isRecurring,
        recurringPeriod: isRecurring ? recurringPeriod : undefined,
        description,
      });

      if (response.data?.data?.anomalyDetection?.isAnomaly) {
        setAnomalyDetectionState({
          show: true,
          data: response.data.data.anomalyDetection,
          pendingExpense: expense,
        });
        return;
      }

      setOpenAddExpenseModal(false);
      toast.success("Expense added successfully");
      fetchExpenseDetails();
      fetchAnomalyTransactions();
    } catch (error: any) {
      console.error(
        "Error adding expense:",
        error.response?.data?.message ?? error.message,
      );
      toast.error("Failed to add expense. Please try again.");
    }
  };

  // Handle Edit Expense
  const handleEditExpense = (expense: ExpenseData) => {
    setEditingExpense(expense);
    setOpenEditExpenseModal(true);
  };

  // Handle Update Expense
  const handleUpdateExpense = async (updatedExpense: any) => {
    const {
      _id,
      category,
      amount,
      date,
      icon,
      isRecurring,
      recurringPeriod,
      description,
    } = updatedExpense;

    // Validation Checks
    if (!(category as string)?.trim()) {
      toast.error("Category is required.");
      return;
    }

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast.error("Amount should be a valid number greater than 0.");
      return;
    }

    if (!date) {
      toast.error("Date is required.");
      return;
    }

    if (isRecurring && !recurringPeriod) {
      toast.error("Recurring period is required for recurring expenses.");
      return;
    }

    try {
      await axiosInstance.put(API_PATHS.EXPENSE.UPDATE_EXPENSE(_id as string), {
        category,
        amount: Number(amount),
        date,
        icon,
        isRecurring,
        recurringPeriod: isRecurring ? recurringPeriod : undefined,
        description,
      });

      setOpenEditExpenseModal(false);
      setEditingExpense(null);
      toast.success("Expense updated successfully");
      fetchExpenseDetails();
    } catch (error: any) {
      console.error(
        "Error updating expense:",
        error.response?.data?.message ?? error.message,
      );
      toast.error("Failed to update expense. Please try again.");
    }
  };

  // Handle Toggle Recurring
  const handleToggleRecurring = async (id: string) => {
    try {
      await axiosInstance.patch(API_PATHS.EXPENSE.TOGGLE_RECURRING_EXPENSE(id));
      toast.success("Recurring status updated successfully");
      fetchExpenseDetails();
    } catch (error: any) {
      console.error(
        "Error toggling recurring:",
        error.response?.data?.message ?? error.message,
      );
      toast.error("Failed to update recurring status. Please try again.");
    }
  };

  // Delete Expense
  const deleteExpense = async (id: string) => {
    try {
      await axiosInstance.delete(API_PATHS.EXPENSE.DELETE_EXPENSE(id));

      setOpenDeleteAlert({ show: false, data: null });
      toast.success("Expense details deleted successfully");
      fetchExpenseDetails();
    } catch (error: any) {
      console.error(
        "Error deleting expense:",
        error.response?.data?.message ?? error.message,
      );
      toast.error("Failed to delete expense. Please try again.");
    }
  };

  // Handle anomaly detection popup confirmation
  const handleAnomalyConfirm = () => {
    setAnomalyDetectionState({
      show: false,
      data: null,
      pendingExpense: null,
    });
    setOpenAddExpenseModal(false);
    toast.success("Expense added successfully (anomaly acknowledged)");
    fetchExpenseDetails();
    fetchAnomalyTransactions();
  };

  // Handle anomaly detection popup cancellation
  const handleAnomalyCancel = () => {
    setAnomalyDetectionState({
      show: false,
      data: null,
      pendingExpense: null,
    });
    toast("Expense submission cancelled", { icon: "ℹ️" });
  };

  // handle download expense details
  const handleDownloadExpenseDetails = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.EXPENSE.DOWNLOAD_EXPENSE,
        {
          responseType: "blob",
        },
      );

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "expense_details.xlsx");
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading expense details:", error);
      toast.error("Failed to download expense details. Please try again.");
    }
  };

  useEffect(() => {
    void fetchExpenseDetails();
    void fetchAnomalyTransactions();
  }, [fetchExpenseDetails, fetchAnomalyTransactions]);

  return (
    <DashboardLayout activeMenu="Expense">
      <div className="mx-auto my-5">
        <div className="grid grid-cols-1 gap-6">
          <div className="mb-4 flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Expenses</h1>
          </div>

          <div className="">
            <ExpenseOverview
              transactions={expenseData}
              onExpenseIncome={() => setOpenAddExpenseModal(true)}
            />
          </div>

          <ExpenseList
            transactions={expenseData}
            anomalyTransactions={anomalyTransactions}
            onDelete={(id) => {
              setOpenDeleteAlert({ show: true, data: id });
            }}
            onEdit={handleEditExpense}
            onToggleRecurring={handleToggleRecurring}
            onDownload={handleDownloadExpenseDetails}
          />

          <Modal
            isOpen={openAddExpenseModal}
            onClose={() => setOpenAddExpenseModal(false)}
            title="Add Expense"
          >
            <AddExpenseForm onAddExpense={handleAddExpense} />
          </Modal>

          <Modal
            isOpen={openEditExpenseModal}
            onClose={() => {
              setOpenEditExpenseModal(false);
              setEditingExpense(null);
            }}
            title="Edit Expense"
          >
            {editingExpense && (
              <EditExpenseForm
                expense={editingExpense}
                onUpdateExpense={handleUpdateExpense}
                onCancel={() => {
                  setOpenEditExpenseModal(false);
                  setEditingExpense(null);
                }}
              />
            )}
          </Modal>

          <Modal
            isOpen={openDeleteAlert.show}
            onClose={() => setOpenDeleteAlert({ show: false, data: null })}
            title="Delete Expense"
          >
            <DeleteAlert
              content="Are you sure you want to delete this expense detail?"
              onDelete={() =>
                openDeleteAlert.data && deleteExpense(openDeleteAlert.data)
              }
            />
          </Modal>

          {anomalyDetectionState.data && (
            <AnomalyDetectionPopup
              isOpen={anomalyDetectionState.show}
              onClose={handleAnomalyCancel}
              onConfirm={handleAnomalyConfirm}
              anomalyData={anomalyDetectionState.data}
            />
          )}
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Expense;
