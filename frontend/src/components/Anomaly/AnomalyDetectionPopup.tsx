"use client";

import React from "react";
import { LuTriangleAlert as LuAlertTriangle, LuX } from "react-icons/lu";
import { formatCurrency } from "~/utils/constants";
import type { AnomalyDetection } from "~/types/transaction.types";

interface AnomalyDetectionPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  anomalyData: AnomalyDetection;
}

const AnomalyDetectionPopup: React.FC<AnomalyDetectionPopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
  anomalyData,
}) => {
  if (!isOpen) return null;

  const getAnomalySeverity = (zScore: number): string => {
    const absZScore = Math.abs(zScore);
    if (absZScore >= 3) return "High";
    if (absZScore >= 2) return "Medium";
    return "Low";
  };

  const getSeverityColor = (zScore: number): string => {
    const absZScore = Math.abs(zScore);
    if (absZScore >= 3) return "text-red-600 bg-red-50";
    if (absZScore >= 2) return "text-orange-600 bg-orange-50";
    return "text-yellow-600 bg-yellow-50";
  };

  return (
    <div className="bg-opacity-50 fixed inset-0 z-50 flex items-center justify-center bg-white/70">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
              <LuAlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">
              Anomaly Detected
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 transition-colors hover:text-gray-600"
          >
            <LuX className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-3">
              <LuAlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div>
                <p className="mb-1 text-sm font-medium text-red-800">
                  Unusual Transaction Detected
                </p>
                <p className="text-sm text-red-700">{anomalyData.message}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                Category:
              </span>
              <span className="text-sm text-gray-900">
                {anomalyData.category}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">Amount:</span>
              <span className="text-sm font-semibold text-gray-900">
                {formatCurrency(anomalyData.amount)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                Severity:
              </span>
              <span
                className={`rounded-full px-2 py-1 text-xs font-medium ${getSeverityColor(anomalyData.zScore)}`}
              >
                {getAnomalySeverity(anomalyData.zScore)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-600">
                Z-Score:
              </span>
              <span className="text-sm text-gray-900">
                {anomalyData.zScore.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700"
          >
            Continue Anyway
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnomalyDetectionPopup;
