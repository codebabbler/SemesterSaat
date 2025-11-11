"use client";

import React, { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "~/components/Layouts/AuthLayout";
import Input from "~/components/Inputs/Input";
import { validateEmail } from "~/utils/helper";
import { API_PATHS } from "~/utils/apiPaths";
import { UserContext } from "~/context/UserContext";
import axiosInstance from "~/utils/axiosInstance";

interface User {
  _id: string;
  email: string;
  fullName: string;
  username: string;
  profileImageUrl?: string;
}

const SignUpForm = () => {
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [errors, setErrors] = useState({
    fullName: "",
    username: "",
    email: "",
    password: "",
    api: "",
  });

  const context = useContext(UserContext);
  if (!context) {
    throw new Error("SignUpForm must be used within a UserProvider");
  }
  const { updateUser } = context;
  const router = useRouter();

  const validateForm = () => {
    const newErrors = {
      fullName: "",
      username: "",
      email: "",
      password: "",
      api: "",
    };

    if (!fullName.trim()) {
      newErrors.fullName = "Full name is required";
    } else if (fullName.trim().length < 2) {
      newErrors.fullName = "Full name must be at least 2 characters";
    }

    if (!username.trim()) {
      newErrors.username = "Username is required";
    } else if (username.trim().length < 3) {
      newErrors.username = "Username must be at least 3 characters";
    } else if (!/^[a-zA-Z0-9_]+$/.test(username)) {
      newErrors.username =
        "Username can only contain letters, numbers and underscores";
    }

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
    return (
      !newErrors.fullName &&
      !newErrors.username &&
      !newErrors.email &&
      !newErrors.password
    );
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    // SignUp API Call
    try {
      // TODO: Implement image upload endpoint in backend
      // For now, register without profile image
      const response = await axiosInstance.post(API_PATHS.AUTH.REGISTER, {
        fullName,
        username,
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
      <div className="mt-10 flex h-auto flex-col justify-center md:mt-0 md:h-full lg:w-[100%]">
        <h3 className="text-xl font-semibold text-black">Create an Account</h3>
        <p className="mt-[5px] mb-6 text-xs text-slate-700">
          Join us today by entering your details below.
        </p>

        <form onSubmit={handleSignUp}>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Input
                value={fullName}
                onChange={({ target }) => setFullName(target.value)}
                label="Full Name"
                placeholder="John Doe"
                type="text"
              />
              {errors.fullName && (
                <p className="mt-1 text-xs text-red-500">{errors.fullName}</p>
              )}
            </div>

            <div>
              <Input
                value={username}
                onChange={({ target }) => setUsername(target.value)}
                label="Username"
                placeholder="johndoe"
                type="text"
              />
              {errors.username && (
                <p className="mt-1 text-xs text-red-500">{errors.username}</p>
              )}
            </div>

            <div className="col-span-2">
              <Input
                value={email}
                onChange={({ target }) => setEmail(target.value)}
                label="Email Address"
                placeholder="john@example.com"
                type="text"
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <div className="col-span-2">
              <Input
                value={password}
                onChange={({ target }) => setPassword(target.value)}
                label="Password"
                placeholder="Min 8 Characters"
                type="password"
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
            </div>
          </div>

          {errors.api && (
            <p className="pb-2.5 text-xs text-red-500">{errors.api}</p>
          )}

          <button type="submit" className="btn-primary">
            SIGN UP
          </button>

          <p className="mt-3 text-[13px] text-slate-800">
            Already have an account?{" "}
            <Link className="text-primary font-medium underline" href="/login">
              Login
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
};

export default SignUpForm;
