"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { safeLocalStorage } from "~/utils/localStorage";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const isAuthenticated = !!safeLocalStorage.getItem("token");

    // Redirect to dashboard if authenticated, otherwise to login
    if (isAuthenticated) {
      router.push("/dashboard");
    } else {
      router.push("/login");
    }
  }, [router]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-gray-800">Loading...</h1>
        <p className="text-gray-600 mt-2">Redirecting you to the app...</p>
      </div>
    </div>
  );
}
