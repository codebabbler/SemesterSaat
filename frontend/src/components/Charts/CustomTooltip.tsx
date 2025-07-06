"use client";

import React from "react";
import { formatCurrency } from "~/utils/constants";

interface TooltipPayload {
  value?: number;
  payload?: {
    name: string;
    amount: number;
  };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

const CustomTooltip: React.FC<CustomTooltipProps> = ({ active, payload }) => {
  if (active && payload?.length && payload[0]) {
    return (
      <div className="rounded-lg border border-gray-300 bg-white p-2 shadow-md">
        <p className="mb-1 text-xs font-semibold text-purple-800">
          {payload[0]?.payload?.name}
        </p>
        <p className="text-sm text-gray-600">
          Amount:{" "}
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(payload[0]?.value || 0)}
          </span>
        </p>
      </div>
    );
  }
  return null;
};

export default CustomTooltip;
