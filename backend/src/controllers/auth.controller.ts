import asyncHandler from "../utils/asyncHandler";
import ApiErrors from "../utils/ApiErrors";
import User from "../models/user.models";
import ApiResponse from "../utils/ApiResponse";
import JWT from "jsonwebtoken";
import { Request, Response } from "express";
import { Document } from "mongoose";

interface IUser extends Document {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  password: string;
  refreshToken?: string;
  generateAccessToken(): string;
  generateRefreshToken(): string;
  isPasswordCorrect(password: string): Promise<boolean>;
}

interface AuthenticatedRequest extends Request {
  user?: IUser;
}

const generateAccessAndRefreshToken = async (userID: string) => {
  try {
    const user = (await User.findById(userID)) as IUser | null;
    if (!user) {
      throw new ApiErrors(404, "User not found");
    }
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshToken = refreshToken;
    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    throw new ApiErrors(500, "Something went wrong while generating tokens");
  }
};

const registerUser = asyncHandler(async (req: Request, res: Response) => {
  const { fullName, username, email, password } = req.body;

  if (
    [fullName, username, email, password].some(
      (field) => field === undefined || field === null || field.trim() === ""
    )
  ) {
    throw new ApiErrors(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ email }, { username }],
  });

  if (existedUser) {
    throw new ApiErrors(409, "User with email or username already exists");
  }

  const user = await User.create({
    fullName,
    username: username.toLowerCase(),
    email,
    password,
  });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiErrors(500, "Something went wrong while registering user");
  }

  console.log("req.files: ", req.files);
  res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User created successfully"));
  return;
});

const loginUser = asyncHandler(async (req: Request, res: Response) => {
  const { email, username, password } = req.body;
  console.log(email, username, password);

  if (!email && !username) {
    throw new ApiErrors(400, "Please provide email or username");
  }
  const user = (await User.findOne({
    $or: [{ email: email }, { username: username?.toLowerCase() }],
  })) as IUser | null;
  if (!user) {
    throw new ApiErrors(404, "User does not exist");
  }
  const isPasswordCorrect = await user.isPasswordCorrect(password);
  if (!isPasswordCorrect) {
    throw new ApiErrors(401, "Invalid credentials");
  }
  const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
    user._id.toString()
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!loggedInUser) {
    throw new ApiErrors(500, "Something went wrong while logging in");
  }

  const options = {
    httpOnly: true,
    secure: true,
  };
  res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

const logoutUser = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }
    await User.findByIdAndUpdate(req.user._id, {
      $set: { refreshToken: undefined },
      new: true,
    });
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

const refreshAccessToken = asyncHandler(async (req: Request, res: Response) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;
  if (!incomingRefreshToken) {
    throw new ApiErrors(401, "unauthorized access, no refresh token provided");
  }
  try {
    const decodedToken = JWT.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET as string
    ) as JWT.JwtPayload;
    const user = (await User.findById(decodedToken?._id)) as IUser | null;
    if (!user) {
      throw new ApiErrors(401, "Invalid refresh token");
    }
    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiErrors(401, "Refresh token is invalid or used");
    }
    const options = {
      httpOnly: true,
      secure: true,
    };
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
      user._id.toString()
    );
    res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
        new ApiResponse(
          200,
          {
            user: user,
            accessToken,
            refreshToken,
          },
          "Access token refreshed successfully"
        )
      );
    return;
  } catch (error: any) {
    throw new ApiErrors(401, error?.message || "Unauthorized access");
  }
});

const changePassword = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { oldPassword, newPassword } = req.body;
    if (!req.user) {
      throw new ApiErrors(401, "User not authenticated");
    }
    const user = (await User.findById(req.user._id)) as IUser | null;
    if (!user) {
      throw new ApiErrors(404, "User not found");
    }
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      throw new ApiErrors(401, "Old password is incorrect");
    }
    user.password = newPassword;
    await user.save({ validateBeforeSave: true });
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
    const user = (await User.findById(req.user._id).select(
      "-password -refreshToken"
    )) as IUser | null;
    if (!user) {
      throw new ApiErrors(404, "User not found");
    }
    if (fullName) user.fullName = fullName;
    if (username) user.username = username.toLowerCase();
    if (email) user.email = email.toLowerCase();

    await user.save({ validateBeforeSave: true });
    res

      .status(200)
      .json(new ApiResponse(200, user, "User profile updated successfully"));
    return;
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
};
