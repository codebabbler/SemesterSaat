"use client";

import React from "react";
import Image from "next/image";
import {
  LuUtensils,
  LuTrendingUp,
  LuTrendingDown,
  LuTrash2,
} from "react-icons/lu";
import { formatCurrency } from "~/utils/constants";

interface TransactionInfoCardProps {
  icon?: string;
  title: string;
  date: string;
  amount: string | number;
  type: "income" | "expense";
  hideDeleteBtn?: boolean;
  onDelete?: () => void;
  isRecurring?: boolean;
  recurringPeriod?: "daily" | "weekly" | "monthly" | "yearly";
  isVirtual?: boolean;
}

const TransactionInfoCard: React.FC<TransactionInfoCardProps> = ({
  icon,
  title,
  date,
  amount,
  type,
  hideDeleteBtn,
  onDelete,
  isRecurring,
  recurringPeriod,
  isVirtual,
}) => {
  const getAmountStyles = () =>
    type === "income" ? "bg-green-50 text-green-500" : "bg-red-50 text-red-500";

  return (
    <div className="group relative mt-2 flex items-center gap-4 rounded-lg p-3 hover:bg-gray-100/60">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-xl text-gray-800">
        {icon ? (
          <Image
            src={icon}
            alt={title}
            width={24}
            height={24}
            className="h-6 w-6"
          />
        ) : (
          <LuUtensils />
        )}
      </div>

      <div className="flex flex-1 items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-700">{title}</p>
            {isRecurring && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Recurring {recurringPeriod}
              </span>
            )}
            {isVirtual && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                Predicted
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-gray-400">{date}</p>
        </div>

        <div className="flex items-center gap-2">
          {!hideDeleteBtn && (
            <button
              className="cursor-pointer text-gray-400 opacity-0 transition-opacity group-hover:opacity-100 hover:text-red-500"
              onClick={onDelete}
            >
              <LuTrash2 size={18} />
            </button>
          )}

          <div
            className={`flex items-center gap-2 rounded-md px-3 py-1.5 ${getAmountStyles()}`}
          >
            <h6 className="text-xs font-medium">
              {type === "income" ? "+" : "-"} {formatCurrency(amount)}
            </h6>
            {type === "income" ? <LuTrendingUp /> : <LuTrendingDown />}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionInfoCard;
