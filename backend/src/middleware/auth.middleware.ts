import asyncHandler from "../utils/asyncHandler";
import ApiErrors from "../utils/ApiErrors";
import JWT from "jsonwebtoken";
import User from "../models/user.models";
import type { IUser } from "../models/user.models";
import { AuthenticatedRequest } from "../types/common.types";

export const verifyJWT = asyncHandler(async (req: AuthenticatedRequest, _, next) => {
  try {
    let token = req.cookies?.accessToken;
    
    // Check for Authorization header
    const authHeader = req.header("authorization") || req.header("Authorization");
    if (!token && authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.replace("Bearer ", "");
    }
    
    if (!token) {
      throw new ApiErrors(401, "Access token is required");
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
    if (error instanceof JWT.JsonWebTokenError) {
      throw new ApiErrors(401, "Invalid access token");
    } else if (error instanceof JWT.TokenExpiredError) {
      throw new ApiErrors(401, "Access token expired");
    } else if (error instanceof ApiErrors) {
      throw error;
    } else {
      throw new ApiErrors(401, "Unauthorized access");
    }
  }
});
