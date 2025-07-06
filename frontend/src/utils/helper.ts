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
}

interface IncomeData {
  date: string;
  amount: number;
  source: string;
}

interface ExpenseLineData {
  date: string;
  amount: number;
  category: string;
}

export const prepareExpenseBarChartData = (data: ExpenseData[] = []) => {
  const chartData = data.map((item) => ({
    category: item?.category,
    amount: item?.amount,
  }));

  return chartData;
};

export const prepareIncomeBarChartData = (data: IncomeData[] = []) => {
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const chartData = sortedData.map((item) => ({
    month: moment(item?.date).format('Do MMM'),
    amount: item?.amount,
    source: item?.source,
  }));

  return chartData;
};

export const prepareExpenseLineChartData = (data: ExpenseLineData[] = []) => {
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const chartData = sortedData.map((item) => ({
    month: moment(item?.date).format('Do MMM'),
    amount: item?.amount,
    category: item?.category,
  }));

  return chartData;
};