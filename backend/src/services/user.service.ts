import User from "../models/user.models";
import type { IUser } from "../models/user.models";
import ApiErrors from "../utils/ApiErrors";
import JWT from "jsonwebtoken";

interface UserRegistrationData {
  fullName: string;
  username: string;
  email: string;
  password: string;
}

interface UserLoginData {
  email?: string;
  username?: string;
  password: string;
}

interface UserProfileUpdateData {
  fullName?: string;
  username?: string;
  email?: string;
}

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface UserWithTokens {
  user: IUser;
  accessToken: string;
  refreshToken: string;
}

class UserService {
  async generateAccessAndRefreshToken(userID: string): Promise<TokenPair> {
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
  }

  async registerUser(userData: UserRegistrationData): Promise<UserWithTokens> {
    const { fullName, username, email, password } = userData;

    // Validation
    if ([fullName, username, email, password].some(
      (field) => field === undefined || field === null || field.trim() === ""
    )) {
      throw new ApiErrors(400, "All fields are required");
    }

    // Check if user already exists
    const existedUser = await User.findOne({
      $or: [{ email }, { username }],
    });

    if (existedUser) {
      throw new ApiErrors(409, "User with email or username already exists");
    }

    // Create user
    const user = await User.create({
      fullName,
      username: username.toLowerCase(),
      email,
      password,
    });

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateAccessAndRefreshToken(
      user._id.toString()
    );

    // Get created user without sensitive data
    const createdUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!createdUser) {
      throw new ApiErrors(500, "Something went wrong while registering user");
    }

    return {
      user: createdUser,
      accessToken,
      refreshToken,
    };
  }

  async loginUser(loginData: UserLoginData): Promise<UserWithTokens> {
    const { email, username, password } = loginData;

    // Validation
    if (!email && !username) {
      throw new ApiErrors(400, "Please provide email or username");
    }

    // Find user
    const user = (await User.findOne({
      $or: [{ email: email }, { username: username?.toLowerCase() }],
    })) as IUser | null;

    if (!user) {
      throw new ApiErrors(404, "User does not exist");
    }

    // Verify password
    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if (!isPasswordCorrect) {
      throw new ApiErrors(401, "Invalid credentials");
    }

    // Generate tokens
    const { accessToken, refreshToken } = await this.generateAccessAndRefreshToken(
      user._id.toString()
    );

    // Get logged in user without sensitive data
    const loggedInUser = await User.findById(user._id).select(
      "-password -refreshToken"
    );

    if (!loggedInUser) {
      throw new ApiErrors(500, "Something went wrong while logging in");
    }

    return {
      user: loggedInUser,
      accessToken,
      refreshToken,
    };
  }

  async logoutUser(userId: string): Promise<void> {
    await User.findByIdAndUpdate(
      userId,
      { $unset: { refreshToken: 1 } },
      { new: true }
    );
  }

  async refreshAccessToken(incomingRefreshToken: string): Promise<UserWithTokens> {
    if (!incomingRefreshToken) {
      throw new ApiErrors(401, "Unauthorized access, no refresh token provided");
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

      const { accessToken, refreshToken } = await this.generateAccessAndRefreshToken(
        user._id.toString()
      );

      return {
        user: user,
        accessToken,
        refreshToken,
      };
    } catch (error: any) {
      throw new ApiErrors(401, error?.message || "Unauthorized access");
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = (await User.findById(userId)) as IUser | null;
    if (!user) {
      throw new ApiErrors(404, "User not found");
    }

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
    if (!isPasswordCorrect) {
      throw new ApiErrors(401, "Old password is incorrect");
    }

    user.password = newPassword;
    await user.save({ validateBeforeSave: true });
  }

  async getUserProfile(userId: string): Promise<IUser> {
    const user = await User.findById(userId).select("-password -refreshToken");
    if (!user) {
      throw new ApiErrors(404, "User not found");
    }
    return user;
  }

  async updateUserProfile(userId: string, updateData: UserProfileUpdateData): Promise<IUser> {
    const { fullName, username, email } = updateData;

    const user = (await User.findById(userId).select(
      "-password -refreshToken"
    )) as IUser | null;

    if (!user) {
      throw new ApiErrors(404, "User not found");
    }

    // Check for username/email conflicts if they're being updated
    if (username || email) {
      const conflictQuery = [];
      if (username) conflictQuery.push({ username: username.toLowerCase() });
      if (email) conflictQuery.push({ email: email.toLowerCase() });

      const existingUser = await User.findOne({
        $and: [
          { _id: { $ne: userId } }, // Exclude current user
          { $or: conflictQuery }
        ]
      });

      if (existingUser) {
        throw new ApiErrors(409, "Username or email already exists");
      }
    }

    // Update fields
    if (fullName) user.fullName = fullName;
    if (username) user.username = username.toLowerCase();
    if (email) user.email = email.toLowerCase();

    await user.save({ validateBeforeSave: true });
    return user;
  }

  async getUserById(userId: string): Promise<IUser | null> {
    return await User.findById(userId).select("-password -refreshToken");
  }

  async getUserByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email }).select("-password -refreshToken");
  }

  async getUserByUsername(username: string): Promise<IUser | null> {
    return await User.findOne({ username: username.toLowerCase() }).select("-password -refreshToken");
  }

  async deleteUser(userId: string): Promise<void> {
    const result = await User.findByIdAndDelete(userId);
    if (!result) {
      throw new ApiErrors(404, "User not found");
    }
  }

  async getUserStats(): Promise<{
    totalUsers: number;
    activeUsers: number;
    newUsersThisMonth: number;
  }> {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const [totalUsers, newUsersThisMonth] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ createdAt: { $gte: startOfMonth } }),
    ]);

    return {
      totalUsers,
      activeUsers: totalUsers, // Simplified - could track last login dates
      newUsersThisMonth,
    };
  }
}

export default new UserService();
export type { UserRegistrationData, UserLoginData, UserProfileUpdateData, TokenPair, UserWithTokens };