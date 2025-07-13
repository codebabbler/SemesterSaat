// Currency configuration
export const CURRENCY = "NPR";

// Format currency with the NPR prefix and proper number formatting
export const formatCurrency = (amount: number | string): string => {
  const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numAmount)) return `${CURRENCY} 0`;
  
  // Add thousands separator
  const formattedAmount = numAmount.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
  
  return `${CURRENCY} ${formattedAmount}`;
};
