import axios from "axios";
import { BASE_URL, API_PATHS } from "./apiPaths";

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
  (response) => {
    return response;
  },
  async (error: unknown) => {
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number }; config?: any };
      
      // If we get 401 and it's not a login/register request, try to refresh token
      if (axiosError.response?.status === 401 && axiosError.config) {
        const originalRequest = axiosError.config;
        
        // Don't retry for login/register requests
        if (originalRequest.url?.includes('/login') || 
            originalRequest.url?.includes('/register') ||
            originalRequest._retry) {
          // Clear any existing auth state and redirect to login
          window.location.href = "/login";
          return Promise.reject(error);
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
          return Promise.reject(refreshError);
        }
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