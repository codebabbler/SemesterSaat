"use client";

import React, { useContext, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import AuthLayout from "~/components/Layouts/AuthLayout";
import Input from "~/components/Inputs/Input";
import { validateEmail } from "~/utils/helper";
import ProfilePhotoSelector from "~/components/Inputs/ProfilePhotoSelector";
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
  const [profilePic, setProfilePic] = useState<File | null>(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");

  const context = useContext(UserContext);
  if (!context) {
    throw new Error("SignUpForm must be used within a UserProvider");
  }
  const { updateUser } = context;
  const router = useRouter();

  // Handle Sign Up Form Submit
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();

    let profileImageUrl = "";

    if (!fullName) {
      setError("Please enter your name");
      return;
    }

    if (!username) {
      setError("Please enter a username");
      return;
    }

    if (!validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!password) {
      setError("Please enter the password");
      return;
    }

    setError("");

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

      const { data } = response.data as { data: { user: User; accessToken: string; refreshToken: string } };

      if (data.user) {
        // Convert _id to id for frontend compatibility
        const userWithId = { ...data.user, id: data.user._id };
        updateUser(userWithId);
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { data?: { message?: string } } };
        if (axiosError.response?.data?.message) {
          setError(axiosError.response.data.message);
        } else {
          setError("Something went wrong. Please try again.");
        }
      } else {
        setError("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <AuthLayout>
      <div className="lg:w-[100%] h-auto md:h-full mt-10 md:mt-0 flex flex-col justify-center">
        <h3 className="text-xl font-semibold text-black">Create an Account</h3>
        <p className="text-xs text-slate-700 mt-[5px] mb-6">
          Join us today by entering your details below.
        </p>

        <form onSubmit={handleSignUp}>
          

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              value={fullName}
              onChange={({ target }) => setFullName(target.value)}
              label="Full Name"
              placeholder="John Doe"
              type="text"
            />

            <Input
              value={username}
              onChange={({ target }) => setUsername(target.value)}
              label="Username"
              placeholder="johndoe"
              type="text"
            />

            <div className="col-span-2">
              <Input
                value={email}
                onChange={({ target }) => setEmail(target.value)}
                label="Email Address"
                placeholder="john@example.com"
                type="text"
              />
            </div>

            <div className="col-span-2">
              <Input
                value={password}
                onChange={({ target }) => setPassword(target.value)}
                label="Password"
                placeholder="Min 8 Characters"
                type="password"
              />
            </div>
          </div>

          {error && <p className="text-red-500 text-xs pb-2.5">{error}</p>}

          <button type="submit" className="btn-primary">
            SIGN UP
          </button>

          <p className="text-[13px] text-slate-800 mt-3">
            Already have an account?{" "}
            <Link className="font-medium text-primary underline" href="/login">
              Login
            </Link>
          </p>
        </form>
      </div>
    </AuthLayout>
  );
};

export default SignUpForm;