import { Schema, model, Document } from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";

// User interface
interface IUser extends Document {
  _id: string;
  username: string;
  fullName: string;
  email: string;
  password: string;
  profileImageUrl?: string;
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
  generateAccessToken(): string;
  generateRefreshToken(): string;
  isPasswordCorrect(password: string): Promise<boolean>;
}
const userSchema = new Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
    },
    profileImageUrl: {
      type: String,
      default: null,
    },
    refreshToken: {
      type: String,
    },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.isPasswordCorrect = async function (password: string) {
  return await bcrypt.compare(password, this.password);
};

userSchema.methods.generateAccessToken = function () {
  const jwtSecret = process.env.ACCESS_TOKEN_SECRET;
  if (!jwtSecret) {
    throw new Error("ACCESS_TOKEN_SECRET is not defined");
  }

  const jwtPayload = {
    _id: this._id,
    email: this.email,
    username: this.username,
    fullName: this.fullName,
  };
  const jwtOptions = {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRY || "15m",
  } as jwt.SignOptions;

  return jwt.sign(jwtPayload, jwtSecret, jwtOptions);
};

userSchema.methods.generateRefreshToken = function () {
  const jwtSecret = process.env.REFRESH_TOKEN_SECRET;
  if (!jwtSecret) {
    throw new Error("REFRESH_TOKEN_SECRET is not defined");
  }

  const jwtPayload = { _id: this._id };
  const jwtOptions = {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRY || "7d",
  } as jwt.SignOptions;

  return jwt.sign(jwtPayload, jwtSecret, jwtOptions);
};

// Create indexes for better query performance
userSchema.index({ refreshToken: 1 });

const User = model<IUser>("User", userSchema);

export default User;
export type { IUser };
