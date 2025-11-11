"use client";

import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Area,
  AreaChart,
} from "recharts";
import { formatCurrency } from "~/utils/constants";

interface ChartData {
  month?: string;
  category?: string;
  amount: number;
  hasRecurring?: boolean;
  hasVirtual?: boolean;
}

interface TooltipPayload {
  payload: ChartData;
}

interface CustomLineChartProps {
  data: ChartData[];
}

const CustomLineChart: React.FC<CustomLineChartProps> = ({ data }) => {
  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: TooltipPayload[];
  }) => {
    if (active && payload?.length && payload[0]) {
      return (
        <div className="rounded-lg border border-gray-300 bg-white p-2 shadow-md">
          <p className="mb-1 text-xs font-semibold text-purple-800">
            {payload[0].payload.category}
          </p>
          <p className="text-sm text-gray-600">
            Amount:{" "}
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(payload[0].payload.amount)}
            </span>
          </p>
          {payload[0].payload.hasRecurring && (
            <p className="text-xs text-blue-600">🔄 Recurring</p>
          )}
          {payload[0].payload.hasVirtual && (
            <p className="text-xs text-purple-600">🔮 Predicted</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white">
      <div className="mb-4 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#ab8df8' }}></div>
          <span>Regular</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#3b82f6' }}></div>
          <span>Recurring</span>
        </div>
        {/* <div className="flex items-center gap-1">
          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: '#a855f7' }}></div>
          <span>Predicted</span>
        </div> */}
      </div>
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={data}>
          <defs>
            <linearGradient id="incomeGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#875cf5" stopOpacity={0.4} />
              <stop offset="95%" stopColor="#875cf5" stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid stroke="none" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 12, fill: "#555" }}
            stroke="none"
          />
          <YAxis tick={{ fontSize: 12, fill: "#555" }} stroke="none" />
          <Tooltip content={<CustomTooltip />} />

          <Area
            type="monotone"
            dataKey="amount"
            stroke="#875cf5"
            fill="url(#incomeGradient)"
            strokeWidth={3}
            dot={(props: { cx?: number; cy?: number; payload?: ChartData }) => {
              const { cx, cy, payload } = props;
              let color = "#ab8df8"; // default
              if (payload?.hasVirtual) color = "#a855f7"; // purple for predicted
              else if (payload?.hasRecurring) color = "#3b82f6"; // blue for recurring
              return <circle cx={cx} cy={cy} r={3} fill={color} stroke={color} strokeWidth={2} />;
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CustomLineChart;
