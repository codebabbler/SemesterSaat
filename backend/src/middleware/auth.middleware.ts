import asyncHandler from "../utils/asyncHandler";
import ApiErrors from "../utils/ApiErrors";
import JWT from "jsonwebtoken";
import User from "../models/user.models";
import type { IUser } from "../models/user.models";
import { AuthenticatedRequest } from "../types/common.types";

export const verifyJWT = asyncHandler(async (req: AuthenticatedRequest, _, next) => {
  try {
    const token =
      req.cookies?.accessToken ||
      req.header("authorization")?.replace("Bearer ", "");
    if (!token) {
      throw new ApiErrors(401, "Unauthorized access");
    }
    const decodedToken = JWT.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET as string
    ) as JWT.JwtPayload;
    const user = await User.findById(decodedToken?._id).select(
      "-password -refreshToken"
    ) as IUser | null;
    if (!user) {
      throw new ApiErrors(401, "Invalid access token");
    }
    req.user = user;
    next();
  } catch (error: any) {
    throw new ApiErrors(401, error?.message || "Unauthorized access");
  }
});
