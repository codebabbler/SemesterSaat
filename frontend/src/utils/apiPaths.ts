export const BASE_URL = "http://localhost:8000";

// utils/apiPaths.ts
export const API_PATHS = {
  AUTH: {
    LOGIN: "/api/v1/user/login",
    REGISTER: "/api/v1/user/register",
    GET_USER_INFO: "/api/v1/user/profile",
    LOGOUT: "/api/v1/user/logout",
    UPDATE_PROFILE: "/api/v1/user/profile",
    CHANGE_PASSWORD: "/api/v1/user/change-password",
    REFRESH_TOKEN: "/api/v1/user/refresh-token",
  },
  DASHBOARD: {
    GET_DATA: "/api/v1/dashboard",
    SUMMARY: "/api/v1/dashboard/summary",
    CASHFLOW: "/api/v1/dashboard/cashflow",
  },
  INCOME: {
    ADD_INCOME: "/api/v1/income/",
    GET_ALL_INCOME: "/api/v1/income/",
    GET_INCOME: (incomeId: string) => `/api/v1/income/${incomeId}`,
    UPDATE_INCOME: (incomeId: string) => `/api/v1/income/${incomeId}`,
    DELETE_INCOME: (incomeId: string) => `/api/v1/income/${incomeId}`,
    DOWNLOAD_INCOME: `/api/v1/income/download/excel`,
    STATS: "/api/v1/income/stats",
  },
  EXPENSE: {
    ADD_EXPENSE: "/api/v1/expense/",
    GET_ALL_EXPENSE: "/api/v1/expense/",
    GET_EXPENSE: (expenseId: string) => `/api/v1/expense/${expenseId}`,
    UPDATE_EXPENSE: (expenseId: string) => `/api/v1/expense/${expenseId}`,
    DELETE_EXPENSE: (expenseId: string) => `/api/v1/expense/${expenseId}`,
    DOWNLOAD_EXPENSE: `/api/v1/expense/download/excel`,
    STATS: "/api/v1/expense/stats",
    TRENDS_MONTHLY: "/api/v1/expense/trends/monthly",
    BY_CATEGORY: (category: string) => `/api/v1/expense/category/${category}`,
  },
  IMAGE: {
    UPLOAD_IMAGE: "/api/v1/auth/upload-image",
  },
};