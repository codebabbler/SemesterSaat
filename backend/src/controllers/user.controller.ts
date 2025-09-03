import asyncHandler from "../utils/asyncHandler";
import ApiErrors from "../utils/ApiErrors";
import ApiResponse from "../utils/ApiResponse";
import { Response } from "express";
import { AuthenticatedRequest } from "../types/common.types";
import UserService from "../services/user.service";
import type { IUser } from "../models/user.models";

const registerUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { fullName, username, email, password } = req.body;

    const result = await UserService.registerUser({
      fullName,
      username,
      email,
      password,
    });

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(201)
      .cookie("accessToken", result.accessToken, options)
      .cookie("refreshToken", result.refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          },
          "User created successfully"
        )
      );
  }
);

const loginUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { email, username, password } = req.body;

    const result = await UserService.loginUser({
      email,
      username,
      password,
    });

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("accessToken", result.accessToken, options)
      .cookie("refreshToken", result.refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          },
          "User logged in successfully"
        )
      );
  }
);

const logoutUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    await UserService.logoutUser(req.user._id.toString());

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .clearCookie("accessToken", options)
      .clearCookie("refreshToken", options)
      .json(new ApiResponse(200, null, "User logged out successfully"));
  }
);

const refreshAccessToken = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const incomingRefreshToken =
      req.cookies?.refreshToken || req.body?.refreshToken;

    const result = await UserService.refreshAccessToken(incomingRefreshToken);

    const options = {
      httpOnly: true,
      secure: true,
    };

    res
      .status(200)
      .cookie("accessToken", result.accessToken, options)
      .cookie("refreshToken", result.refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: result.user,
            accessToken: result.accessToken,
            refreshToken: result.refreshToken,
          },
          "Access token refreshed successfully"
        )
      );
  }
);

const changePassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    await UserService.changePassword(req.user._id.toString(), oldPassword, newPassword);

    res
      .status(200)
      .json(new ApiResponse(200, null, "Password changed successfully"));
  }
);

const getUserProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    res
      .status(200)
      .json(
        new ApiResponse(200, req.user, "User profile fetched successfully")
      );
  }
);

const updateUserProfile = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { fullName, username, email } = req.body;
    
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }

    const updatedUser = await UserService.updateUserProfile(req.user._id.toString(), {
      fullName,
      username,
      email,
    });

    res
      .status(200)
      .json(new ApiResponse(200, updatedUser, "User profile updated successfully"));
  }
);

export {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  changePassword,
  getUserProfile,
  updateUserProfile,
  IUser,
};