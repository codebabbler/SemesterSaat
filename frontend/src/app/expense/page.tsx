"use client";

import React from "react";
import DashboardLayout from "~/components/Layouts/DashboardLayout";
import { useUserAuth } from "~/hooks/useUserAuth";

const Expense = () => {
  useUserAuth();

  return (
    <DashboardLayout activeMenu="Expense">
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Expense Management</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Add Expense</h3>
            <form className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  className="input-box"
                  placeholder="Enter amount"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <input
                  type="text"
                  className="input-box"
                  placeholder="Enter expense category"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  className="input-box"
                />
              </div>
              <button type="submit" className="btn-primary">
                Add Expense
              </button>
            </form>
          </div>
          
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Expenses</h3>
            <div className="space-y-2">
              <p className="text-gray-500 text-center py-8">No expense records yet</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Expense;