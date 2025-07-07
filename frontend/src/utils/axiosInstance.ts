import axios from "axios";
import { BASE_URL } from "./apiPaths";
import { safeLocalStorage } from "./localStorage";

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request Interceptor
axiosInstance.interceptors.request.use(
  (config) => {
    const accessToken = safeLocalStorage.getItem("token");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }
    return config;
  },
  (error: unknown) => {
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

// Response Interceptor
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: unknown) => {
    // Handle common errors globally
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        // Redirect to login page
        window.location.href = "/login";
      } else if (axiosError.response?.status === 500) {
        console.error("Server error. Please try again later.");
      }
    } else if (error && typeof error === 'object' && 'code' in error) {
      const networkError = error as { code?: string };
      if (networkError.code === "ECONNABORTED") {
        console.error("Request timeout. Please try again.");
      }
    }
    return Promise.reject(error instanceof Error ? error : new Error(String(error)));
  }
);

export default axiosInstance;