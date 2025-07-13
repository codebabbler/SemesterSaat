import axios, {
  type AxiosResponse,
  type AxiosRequestConfig,
  type AxiosError,
} from "axios";
import { BASE_URL, API_PATHS } from "./apiPaths";

// Define the API response structure
interface ApiResponse<T = unknown> {
  statusCode: number;
  data: T;
  message: string;
  success: boolean;
}

// Extended AxiosRequestConfig to include retry flag
interface ExtendedAxiosRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
}

// Utility function to extract data from API response
export const extractApiData = <T>(
  response: AxiosResponse<ApiResponse<T>>,
): T => {
  return response.data.data;
};

// Utility function to extract full API response details
export const extractApiResponse = <T>(
  response: AxiosResponse<ApiResponse<T>>,
) => {
  return {
    data: response.data.data,
    statusCode: response.data.statusCode,
    message: response.data.message,
    success: response.data.success,
  };
};

const axiosInstance = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true, // Enable cookies
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Response Interceptor for handling token refresh
axiosInstance.interceptors.response.use(
  (response: AxiosResponse<ApiResponse>) => {
    // Keep the original response structure for compatibility
    return response;
  },
  async (error: AxiosError) => {
    // Handle axios errors with proper typing
    if (error.response?.status === 401 && error.config) {
      const originalRequest = error.config as ExtendedAxiosRequestConfig;

      // Don't retry for login/register requests
      if (
        originalRequest.url?.includes("/login") ||
        originalRequest.url?.includes("/register") ||
        originalRequest._retry
      ) {
        // Clear any existing auth state and redirect to login
        window.location.href = "/login";
        return Promise.reject(new Error("Authentication failed"));
      }

      originalRequest._retry = true;

      try {
        // Try to refresh the token
        await axiosInstance.get(API_PATHS.AUTH.REFRESH_TOKEN);
        // Retry the original request
        return axiosInstance(originalRequest);
      } catch (refreshError) {
        // Refresh failed, redirect to login
        window.location.href = "/login";
        return Promise.reject(
          refreshError instanceof Error
            ? refreshError
            : new Error("Token refresh failed"),
        );
      }
    } else if (error.response?.status === 500) {
      console.error("Server error. Please try again later.");
    }

    // Handle network errors
    if (error.code === "ECONNABORTED") {
      console.error("Request timeout. Please try again.");
    }

    return Promise.reject(
      error instanceof Error ? error : new Error(String(error)),
    );
  },
);

export default axiosInstance;
export type { ApiResponse };
