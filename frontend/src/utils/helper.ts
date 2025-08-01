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
  const dateTotals: Record<string, { amount: number; hasRecurring: boolean; hasVirtual: boolean }> = {};

  data.forEach((item) => {
    const date = moment(item?.date).format("Do MMM");
    const amount = item?.amount ?? 0;
    const isRecurring = item?.isRecurring ?? false;
    const isVirtual = (item as { isVirtual?: boolean })?.isVirtual ?? false;

    if (dateTotals[date]) {
      dateTotals[date].amount += amount;
      dateTotals[date].hasRecurring = dateTotals[date].hasRecurring || isRecurring;
      dateTotals[date].hasVirtual = dateTotals[date].hasVirtual || isVirtual;
    } else {
      dateTotals[date] = {
        amount,
        hasRecurring: isRecurring,
        hasVirtual: isVirtual
      };
    }
  });

  // Convert to array format for chart and sort by date
  const chartData = Object.entries(dateTotals).map(([date, info]) => ({
    month: date, // Using 'month' key for consistency with chart component
    amount: info.amount,
    hasRecurring: info.hasRecurring,
    hasVirtual: info.hasVirtual
  }));

  // Sort by date to show latest to the right
  return chartData.sort((a, b) => {
    const dateA = moment(a.month, "Do MMM");
    const dateB = moment(b.month, "Do MMM");
    return dateA.valueOf() - dateB.valueOf();
  });
};

export const prepareIncomeBarChartData = (data: IncomeData[] = []) => {
  // Group income by date and sum amounts
  const dateTotals: Record<string, { amount: number; sources: string[]; hasRecurring: boolean; hasVirtual: boolean }> = {};

  data.forEach((item) => {
    const date = moment(item?.date).format("Do MMM");
    const amount = item?.amount ?? 0;
    const source = item?.source ?? 'Unknown';
    const isRecurring = item?.isRecurring ?? false;
    const isVirtual = (item as { isVirtual?: boolean })?.isVirtual ?? false;

    if (dateTotals[date]) {
      dateTotals[date].amount += amount;
      if (!dateTotals[date].sources.includes(source)) {
        dateTotals[date].sources.push(source);
      }
      dateTotals[date].hasRecurring = dateTotals[date].hasRecurring || isRecurring;
      dateTotals[date].hasVirtual = dateTotals[date].hasVirtual || isVirtual;
    } else {
      dateTotals[date] = {
        amount,
        sources: [source],
        hasRecurring: isRecurring,
        hasVirtual: isVirtual
      };
    }
  });

  // Convert to array format for chart and sort by date
  const chartData = Object.entries(dateTotals).map(([date, info]) => ({
    month: date,
    amount: info.amount,
    source: info.sources.join(', '),
    hasRecurring: info.hasRecurring,
    hasVirtual: info.hasVirtual
  }));

  // Sort by date
  return chartData.sort((a, b) => {
    const dateA = moment(a.month, "Do MMM");
    const dateB = moment(b.month, "Do MMM");
    return dateA.valueOf() - dateB.valueOf();
  });
};

export const prepareExpenseLineChartData = (data: ExpenseLineData[] = []) => {
  // Group expenses by date and sum amounts
  const dateTotals: Record<string, { amount: number; categories: string[]; hasRecurring: boolean; hasVirtual: boolean }> = {};

  data.forEach((item) => {
    const date = moment(item?.date).format("Do MMM");
    const amount = item?.amount ?? 0;
    const category = item?.category ?? 'Unknown';
    const isRecurring = item?.isRecurring ?? false;
    const isVirtual = (item as { isVirtual?: boolean })?.isVirtual ?? false;

    if (dateTotals[date]) {
      dateTotals[date].amount += amount;
      if (!dateTotals[date].categories.includes(category)) {
        dateTotals[date].categories.push(category);
      }
      dateTotals[date].hasRecurring = dateTotals[date].hasRecurring || isRecurring;
      dateTotals[date].hasVirtual = dateTotals[date].hasVirtual || isVirtual;
    } else {
      dateTotals[date] = {
        amount,
        categories: [category],
        hasRecurring: isRecurring,
        hasVirtual: isVirtual
      };
    }
  });

  // Convert to array format for chart and sort by date
  const chartData = Object.entries(dateTotals).map(([date, info]) => ({
    month: date,
    amount: info.amount,
    category: info.categories.join(', '),
    hasRecurring: info.hasRecurring,
    hasVirtual: info.hasVirtual
  }));

  // Sort by date
  return chartData.sort((a, b) => {
    const dateA = moment(a.month, "Do MMM");
    const dateB = moment(b.month, "Do MMM");
    return dateA.valueOf() - dateB.valueOf();
  });
};
