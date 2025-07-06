"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface ChartData {
  month?: string;
  category?: string;
  amount: number;
}

interface TooltipPayload {
  payload: ChartData;
}

interface CustomBarChartProps {
  data: ChartData[];
}

const CustomBarChart: React.FC<CustomBarChartProps> = ({ data }) => {
  // Function to alternate colors
  const getBarColor = (index: number) => {
    return index % 2 === 0 ? "#875cf5" : "#cfbefb";
  };

  // Determine which field to use for X-axis based on data structure
  const getXAxisKey = () => {
    if (data.length > 0 && data[0]) {
      return data[0].month ? "month" : "category";
    }
    return "month"; // default fallback
  };

  const xAxisKey = getXAxisKey();

  const CustomTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: TooltipPayload[];
  }) => {
    if (active && payload?.length && payload[0]) {
      const data = payload[0].payload;
      const label = data.category ?? data.month ?? "Unknown";

      return (
        <div className="rounded-lg border border-gray-300 bg-white p-2 shadow-md">
          <p className="mb-1 text-xs font-semibold text-purple-800">{label}</p>
          <p className="text-sm text-gray-600">
            Amount:{" "}
            <span className="text-sm font-medium text-gray-900">
              ${data.amount}
            </span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="mt-6 bg-white">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid stroke="none" />

          <XAxis
            dataKey={xAxisKey}
            tick={{ fontSize: 12, fill: "#555" }}
            stroke="none"
          />
          <YAxis tick={{ fontSize: 12, fill: "#555" }} stroke="none" />

          <Tooltip content={CustomTooltip} />

          <Bar dataKey="amount" fill="#875cf5" radius={[10, 10, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={index} fill={getBarColor(index)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default CustomBarChart;
