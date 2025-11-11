"use client";

import React, { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "~/components/Layouts/AuthLayout";
import Input from "~/components/Inputs/Input";
import { validateEmail } from "~/utils/helper";
import axiosInstance from "~/utils/axiosInstance";
import { API_PATHS } from "~/utils/apiPaths";
import { UserContext } from "~/context/UserContext";

interface User {
  _id: string;
  email: string;
  fullName: string;
  username: string;
  profileImageUrl?: string;
}

const LoginForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({
    email: "",
    password: "",
    api: "",
  });

  const context = useContext(UserContext);
  if (!context) {
    throw new Error("LoginForm must be used within a UserProvider");
  }
  const { updateUser } = context;
  const router = useRouter();

  const validateForm = () => {
    const newErrors = {
      email: "",
      password: "",
      api: "",
    };

    if (!email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!password) {
      newErrors.password = "Password is required";
    } else if (password.length < 8) {
      newErrors.password = "Password must be at least 8 characters";
    }

    setErrors(newErrors);
    return !newErrors.email && !newErrors.password;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    //Login API Call
    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email,
        password,
      });
      const { data } = response.data as {
        data: { user: User; accessToken: string; refreshToken: string };
      };

      if (data.user) {
        // Convert _id to id for frontend compatibility
        const userWithId = { ...data.user, id: data.user._id };
        updateUser(userWithId);
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      if (error && typeof error === "object" && "response" in error) {
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        const errorMessage =
          axiosError.response?.data?.message ??
          "Something went wrong. Please try again.";
        setErrors((prev) => ({ ...prev, api: errorMessage }));
      } else {
        setErrors((prev) => ({
          ...prev,
          api: "Something went wrong. Please try again.",
        }));
      }
    }
  };

  return (
    <AuthLayout>
      <div className="flex h-3/4 flex-col justify-center md:h-full lg:w-[70%]">
        <h3 className="text-xl font-semibold text-black">Welcome Back</h3>
        <p className="mt-[5px] mb-6 text-xs text-slate-700">
          Please enter your details to log in
        </p>

        <form onSubmit={handleLogin}>
          <Input
            value={email}
            onChange={({ target }) => setEmail(target.value)}
            label="Email Address"
            placeholder="john@example.com"
            type="text"
          />
          {errors.email && (
            <p className="mt-1 mb-2 text-xs text-red-500">{errors.email}</p>
          )}

          <Input
            value={password}
            onChange={({ target }) => setPassword(target.value)}
            label="Password"
            placeholder="Min 8 Characters"
            type="password"
          />
          {errors.password && (
            <p className="mt-1 mb-2 text-xs text-red-500">{errors.password}</p>
          )}

          {errors.api && (
            <p className="pb-2.5 text-xs text-red-500">{errors.api}</p>
          )}

          <button type="submit" className="btn-primary">
            LOGIN
          </button>

          <p className="mt-3 text-[13px] text-slate-800">
            Don&apos;t have an account?{" "}
            <Link className="text-primary font-medium underline" href="/signup">
              SignUp
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
};

export default LoginForm;
