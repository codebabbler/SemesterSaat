"use client";

import React, { useEffect, useState } from "react";
import DashboardLayout from "~/components/Layouts/DashboardLayout";
import { useUserAuth } from "~/hooks/useUserAuth";
import axiosInstance from "~/utils/axiosInstance";
import { API_PATHS } from "~/utils/apiPaths";
import IncomeOverview from "~/components/Income/IncomeOverview";
import IncomeList from "~/components/Income/IncomeList";
import AddIncomeForm from "~/components/Income/AddIncomeForm";
import EditIncomeForm from "~/components/Income/EditIncomeForm";
import DeleteAlert from "~/components/DeleteAlert";
import Modal from "~/components/Modal";
import toast from "react-hot-toast";
import type { IncomeData, IncomeFormData } from "~/types/transaction.types";


const Income = () => {
  useUserAuth();

  const [incomeData, setIncomeData] = useState<IncomeData[]>([]);
  const [loading, setLoading] = useState(false);

  const [openAddIncomeModal, setOpenAddIncomeModal] = useState(false);
  const [openEditIncomeModal, setOpenEditIncomeModal] = useState(false);
  const [editingIncome, setEditingIncome] = useState<IncomeData | null>(null);
  const [openDeleteAlert, setOpenDeleteAlert] = useState<{
    show: boolean;
    data: string | null;
  }>({
    show: false,
    data: null,
  });

  // Get All Income Details
  const fetchIncomeDetails = async () => {
    if (loading) return;

    setLoading(true);

    try {
      const response = await axiosInstance.get(
        `${API_PATHS.INCOME.GET_ALL_INCOME}`
      );

      if (response.data?.data?.income) {
        setIncomeData(response.data.data.income as IncomeData[]);
      }
    } catch (error) {
      console.log("Something went wrong. Please try again.", error);
    } finally {
      setLoading(false);
    }
  };

  // Handle Add Income
  const handleAddIncome = async (income: IncomeFormData) => {
    const { source, description, amount, date, icon, isRecurring, recurringPeriod } = income;

    // Validation Checks
    if (!source.trim()) {
      toast.error("Source is required.");
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
      toast.error("Recurring period is required for recurring income.");
      return;
    }

    try {
      await axiosInstance.post(API_PATHS.INCOME.ADD_INCOME, {
        source,
        description,
        amount: Number(amount),
        date,
        icon,
        isRecurring,
        recurringPeriod: isRecurring ? recurringPeriod : undefined,
      });

      setOpenAddIncomeModal(false);
      toast.success("Income added successfully");
      fetchIncomeDetails();
    } catch (error: any) {
      console.error(
        "Error adding income:",
        error.response?.data?.message || error.message
      );
      toast.error("Failed to add income. Please try again.");
    }
  };

  // Handle Edit Income
  const handleEditIncome = (income: IncomeData) => {
    setEditingIncome(income);
    setOpenEditIncomeModal(true);
  };

  // Handle Update Income
  const handleUpdateIncome = async (updatedIncome: any) => {
    const {
      _id,
      source,
      description,
      amount,
      date,
      icon,
      isRecurring,
      recurringPeriod,
    } = updatedIncome;

    // Validation Checks
    if (!(source as string)?.trim()) {
      toast.error("Source is required.");
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
      toast.error("Recurring period is required for recurring income.");
      return;
    }

    try {
      await axiosInstance.put(API_PATHS.INCOME.UPDATE_INCOME(_id as string), {
        source,
        description,
        amount: Number(amount),
        date,
        icon,
        isRecurring,
        recurringPeriod: isRecurring ? recurringPeriod : undefined,
      });

      setOpenEditIncomeModal(false);
      setEditingIncome(null);
      toast.success("Income updated successfully");
      fetchIncomeDetails();
    } catch (error: any) {
      console.error(
        "Error updating income:",
        error.response?.data?.message || error.message,
      );
      toast.error("Failed to update income. Please try again.");
    }
  };

  // Handle Toggle Recurring
  const handleToggleRecurring = async (id: string) => {
    try {
      await axiosInstance.patch(API_PATHS.INCOME.TOGGLE_RECURRING_INCOME(id));
      toast.success("Recurring status updated successfully");
      fetchIncomeDetails();
    } catch (error: any) {
      console.error(
        "Error toggling recurring:",
        error.response?.data?.message || error.message,
      );
      toast.error("Failed to update recurring status. Please try again.");
    }
  };

  // Delete Income
  const deleteIncome = async (id: string) => {
    try {
      await axiosInstance.delete(API_PATHS.INCOME.DELETE_INCOME(id));

      setOpenDeleteAlert({ show: false, data: null });
      toast.success("Income details deleted successfully");
      fetchIncomeDetails();
    } catch (error: any) {
      console.error(
        "Error deleting income:",
        error.response?.data?.message || error.message
      );
      toast.error("Failed to delete income. Please try again.");
    }
  };

  // handle download income details
  const handleDownloadIncomeDetails = async () => {
    try {
      const response = await axiosInstance.get(
        API_PATHS.INCOME.DOWNLOAD_INCOME,
        {
          responseType: "blob", 
        }
      );

      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "income_details.xlsx"); 
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url); 
    } catch (error) {
      console.error("Error downloading income details:", error);
      toast.error("Failed to download income details. Please try again.");
    }
  };

  useEffect(() => {
    void fetchIncomeDetails();
  }, []);

  return (
    <DashboardLayout activeMenu="Income">
      <div className="my-5 mx-auto">
        <div className="grid grid-cols-1 gap-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-800">Income</h1>
          </div>
          
          <div className="">
            <IncomeOverview
              transactions={incomeData}
              onAddIncome={() => setOpenAddIncomeModal(true)}
            />
          </div>

          <IncomeList
            transactions={incomeData}
            onDelete={(id) => {
              setOpenDeleteAlert({ show: true, data: id });
            }}
            onEdit={handleEditIncome}
            onToggleRecurring={handleToggleRecurring}
            onDownload={handleDownloadIncomeDetails}
          />

          <Modal
            isOpen={openAddIncomeModal}
            onClose={() => setOpenAddIncomeModal(false)}
            title="Add Income"
          >
            <AddIncomeForm onAddIncome={handleAddIncome} />
          </Modal>

          <Modal
            isOpen={openEditIncomeModal}
            onClose={() => {
              setOpenEditIncomeModal(false);
              setEditingIncome(null);
            }}
            title="Edit Income"
          >
            {editingIncome && (
              <EditIncomeForm
                income={editingIncome}
                onUpdateIncome={handleUpdateIncome}
                onCancel={() => {
                  setOpenEditIncomeModal(false);
                  setEditingIncome(null);
                }}
              />
            )}
          </Modal>

          <Modal
            isOpen={openDeleteAlert.show}
            onClose={() => setOpenDeleteAlert({ show: false, data: null })}
            title="Delete Income"
          >
            <DeleteAlert
              content="Are you sure you want to delete this income detail?"
              onDelete={() => openDeleteAlert.data && deleteIncome(openDeleteAlert.data)}
            />
          </Modal>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Income;