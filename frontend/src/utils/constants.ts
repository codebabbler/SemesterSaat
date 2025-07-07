// Currency configuration
export const CURRENCY = "NPR";

// Format currency with the NPR prefix
export const formatCurrency = (amount: number | string): string => {
  return `${CURRENCY} ${amount}`;
};
