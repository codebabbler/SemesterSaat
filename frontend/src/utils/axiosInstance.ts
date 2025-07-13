import axios from "axios";
import { BASE_URL, API_PATHS } from "./apiPaths";
import { safeLocalStorage } from "./localStorage";

interface ApiResponse<T = any> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
}

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
    // Unwrap the data from ApiResponse for successful responses
    if (response.data && typeof response.data === 'object' && 'success' in response.data) {
      const apiResponse = response.data as ApiResponse;
      if (apiResponse.success) {
        // Return the unwrapped data
        response.data = apiResponse.data;
      }
    }
    return response;
  },
  async (error: unknown) => {
    // Handle common errors globally
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as { response?: { status?: number; data?: any } };
      
      if (axiosError.response?.status === 401) {
        // Try to refresh token before redirecting to login
        try {
          const refreshResponse = await axios.get(BASE_URL + API_PATHS.AUTH.REFRESH_TOKEN, {
            withCredentials: true
          });
          
          if (refreshResponse.data && refreshResponse.data.success) {
            const newAccessToken = refreshResponse.data.data.accessToken;
            safeLocalStorage.setItem("token", newAccessToken);
            
            // Retry the original request with new token
            const originalRequest = (error as any).config;
            if (originalRequest) {
              originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
              return axiosInstance(originalRequest);
            }
          }
        } catch (refreshError) {
          // Refresh failed, redirect to login
          safeLocalStorage.removeItem("token");
          window.location.href = "/login";
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