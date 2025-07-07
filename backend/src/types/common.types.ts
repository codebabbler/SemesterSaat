import { Request } from "express";
import type { IUser } from "../models/user.models";

// Common request interface for authenticated routes
export interface AuthenticatedRequest extends Request {
  user?: IUser;
}

// Pagination interface
export interface PaginationQuery {
  page?: string;
  limit?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

// Pagination response interface
export interface PaginationResponse {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  itemsPerPage: number;
}