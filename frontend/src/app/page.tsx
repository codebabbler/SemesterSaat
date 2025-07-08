"use client";

import { useEffect, useContext } from "react";
import { useRouter } from "next/navigation";
import { UserContext } from "~/context/UserContext";
import { useUserAuth } from "~/hooks/useUserAuth";

export default function HomePage() {
  const router = useRouter();
  const context = useContext(UserContext);
  
  if (!context) {
    throw new Error("HomePage must be used within a UserProvider");
  }
  
  const { user } = context;
  
  // Use the auth hook to check/fetch user state
  useUserAuth();

  useEffect(() => {
    // Wait a bit for auth check to complete
    const timer = setTimeout(() => {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [user, router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">Loading...</h1>
        <p className="text-gray-600 mt-2">Redirecting you to the app...</p>
      </div>
    </div>
  );
}
