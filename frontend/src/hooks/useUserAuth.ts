import { useContext, useEffect } from "react";
import { useRouter } from "next/navigation";
import { UserContext } from "../context/UserContext";
import axiosInstance from "../utils/axiosInstance";
import { API_PATHS } from "../utils/apiPaths";

interface User {
  id: string;
  email: string;
  fullName: string;
  profileImageUrl?: string;
}

export const useUserAuth = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserAuth must be used within a UserProvider");
  }
  
  const { user, updateUser, clearUser } = context;
  const router = useRouter();

  useEffect(() => {
    if (user) return;

    let isMounted = true;

    const fetchUserInfo = async () => {
      try {
        const response = await axiosInstance.get(API_PATHS.AUTH.GET_USER_INFO);
        
        if (isMounted && response.data) {
          updateUser(response.data as User);
        }
      } catch (error) {
        console.error("Failed to fetch user info:", error);
        if (isMounted) {
          clearUser();
          router.push("/login");
        }
      }
    };

    void fetchUserInfo();

    return () => {
      isMounted = false;
    };
  }, [updateUser, clearUser, router]);
};