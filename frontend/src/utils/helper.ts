import moment from "moment";

export const validateEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

export const getInitials = (name: string): string => {
  if (!name) return "";
  const words = name.split(" ");
  let initials = "";

  for (let i = 0; i < Math.min(words.length, 2); i++) {
    const word = words[i];
    if (word && word.length > 0) {
      initials += word[0];
    }
  }

  return initials.toUpperCase();
};

export const addThousandsSeparator = (num: number | string): string => {
  if (num == null || isNaN(Number(num))) return "";
  const parts = num.toString().split(".");
  const integerPart = parts[0];
  const fractionalPart = parts[1];

  if (!integerPart) return "";
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return fractionalPart
    ? `${formattedInteger}.${fractionalPart}`
    : formattedInteger;
};

interface ExpenseData {
  category: string;
  amount: number;
  date: string;
  isRecurring?: boolean;
  recurringPeriod?: "daily" | "weekly" | "monthly" | "yearly";
}

interface IncomeData {
  date: string;
  amount: number;
  source: string;
  isRecurring?: boolean;
  recurringPeriod?: "daily" | "weekly" | "monthly" | "yearly";
}

interface ExpenseLineData {
  date: string;
  amount: number;
  category: string;
  isRecurring?: boolean;
  recurringPeriod?: "daily" | "weekly" | "monthly" | "yearly";
}

export const prepareExpenseBarChartData = (data: ExpenseData[] = []) => {
  // Group expenses by date and sum amounts
  const dateTotals: Record<string, number> = {};

  data.forEach((item) => {
    const date = moment(item?.date).format("Do MMM");
    const amount = item?.amount || 0;

    if (dateTotals[date]) {
      dateTotals[date] += amount;
    } else {
      dateTotals[date] = amount;
    }
  });

  // Convert to array format for chart and sort by date
  const chartData = Object.entries(dateTotals).map(([date, amount]) => ({
    month: date, // Using 'month' key for consistency with chart component
    amount,
  }));

  // Sort by date to show latest to the right
  return chartData.sort((a, b) => {
    const dateA = moment(a.month, "Do MMM");
    const dateB = moment(b.month, "Do MMM");
    return dateA.valueOf() - dateB.valueOf();
  });
};

export const prepareIncomeBarChartData = (data: IncomeData[] = []) => {
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const chartData = sortedData.map((item) => ({
    month: moment(item?.date).format("Do MMM"),
    amount: item?.amount,
    source: item?.source,
  }));

  return chartData;
};

export const prepareExpenseLineChartData = (data: ExpenseLineData[] = []) => {
  const sortedData = [...data].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const chartData = sortedData.map((item) => ({
    month: moment(item?.date).format("Do MMM"),
    amount: item?.amount,
    category: item?.category,
  }));

  return chartData;
};
