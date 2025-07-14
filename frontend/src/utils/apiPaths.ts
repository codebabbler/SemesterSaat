export const BASE_URL = "http://localhost:8000";

// utils/apiPaths.ts
export const API_PATHS = {
  AUTH: {
    LOGIN: "/api/v1/user/login",
    REGISTER: "/api/v1/user/register",
    LOGOUT: "/api/v1/user/logout",
    REFRESH_TOKEN: "/api/v1/user/refresh-token",
    PROFILE: "/api/v1/user/profile",
    CHANGE_PASSWORD: "/api/v1/user/change-password",
  },
  DASHBOARD: {
    GET_DATA: "/api/v1/dashboard",
    SUMMARY: "/api/v1/dashboard/summary",
    CASHFLOW: "/api/v1/dashboard/cashflow",
  },
  INCOME: {
    ADD_INCOME: "/api/v1/income",
    GET_ALL_INCOME: "/api/v1/income",
    GET_INCOME_BY_ID: (incomeId: string) => `/api/v1/income/${incomeId}`,
    UPDATE_INCOME: (incomeId: string) => `/api/v1/income/${incomeId}`,
    DELETE_INCOME: (incomeId: string) => `/api/v1/income/${incomeId}`,
    DOWNLOAD_INCOME: `/api/v1/income/download/excel`,
    STATS: "/api/v1/income/stats",
  },
  EXPENSE: {
    ADD_EXPENSE: "/api/v1/expense",
    GET_ALL_EXPENSE: "/api/v1/expense",
    GET_EXPENSE_BY_ID: (expenseId: string) => `/api/v1/expense/${expenseId}`,
    UPDATE_EXPENSE: (expenseId: string) => `/api/v1/expense/${expenseId}`,
    DELETE_EXPENSE: (expenseId: string) => `/api/v1/expense/${expenseId}`,
    DOWNLOAD_EXPENSE: `/api/v1/expense/download/excel`,
    STATS: "/api/v1/expense/stats",
    MONTHLY_TRENDS: "/api/v1/expense/trends/monthly",
    BY_CATEGORY: (category: string) => `/api/v1/expense/category/${category}`,
  },
  IMAGE: {
    UPLOAD_IMAGE: "/api/v1/upload/image",
  },
};