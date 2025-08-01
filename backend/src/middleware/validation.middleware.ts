import { Request, Response, NextFunction } from "express";
import ApiErrors from "../utils/ApiErrors";

// HTML/Script injection detection
const containsScript = (input: string): boolean => {
  const scriptPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /vbscript:/gi
  ];
  
  return scriptPatterns.some(pattern => pattern.test(input));
};

// SQL injection patterns
const containsSQLInjection = (input: string): boolean => {
  const sqlPatterns = [
    /('|(\\\')|(\-\-)|(%3D)|(=))/gi,
    /((\%3C)|<)((\%2F)|\/)*[a-z0-9\%]+((\%3E)|>)/gi,
    /((\%3C)|<)((\%69)|i|(\%49))((\%6D)|m|(\%4D))((\%67)|g|(\%47))[^\n]+((\%3E)|>)/gi
  ];
  
  return sqlPatterns.some(pattern => pattern.test(input));
};

// Sanitize string input
export const sanitizeString = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/['"`;]/g, '') // Remove potential injection characters
    .substring(0, 1000); // Limit length
};

// Validation middleware for expense/income creation
export const validateTransactionInput = (req: Request, res: Response, next: NextFunction) => {
  const { category, amount, date, icon } = req.body;
  
  // Required field validation
  if (!category || !amount || !date) {
    throw new ApiErrors(400, "Category, amount, and date are required");
  }
  
  // Type validation
  if (typeof amount !== 'number' || amount <= 0) {
    throw new ApiErrors(400, "Amount must be a positive number");
  }
  
  if (amount > 1000000) {
    throw new ApiErrors(400, "Amount cannot exceed 1,000,000");
  }
  
  // String validation
  if (typeof category !== 'string' || category.length > 100) {
    throw new ApiErrors(400, "Category must be a string with maximum 100 characters");
  }
  
  if (containsScript(category) || containsSQLInjection(category)) {
    throw new ApiErrors(400, "Category contains invalid characters");
  }
  
  // Date validation
  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) {
    throw new ApiErrors(400, "Invalid date format");
  }
  
  const now = new Date();
  const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
  const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate());
  
  if (parsedDate < oneYearAgo || parsedDate > oneYearFromNow) {
    throw new ApiErrors(400, "Date must be within one year of current date");
  }
  
  // Icon validation (optional)
  if (icon && (typeof icon !== 'string' || icon.length > 10)) {
    throw new ApiErrors(400, "Icon must be a string with maximum 10 characters");
  }
  
  // Sanitize inputs
  req.body.category = sanitizeString(category);
  if (icon) req.body.icon = sanitizeString(icon);
  
  next();
};

// Validation for user registration
export const validateUserRegistration = (req: Request, res: Response, next: NextFunction) => {
  const { fullName, username, email, password } = req.body;
  
  // Required fields
  if (!fullName || !username || !email || !password) {
    throw new ApiErrors(400, "All fields are required");
  }
  
  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new ApiErrors(400, "Invalid email format");
  }
  
  // Password strength validation
  if (password.length < 8) {
    throw new ApiErrors(400, "Password must be at least 8 characters long");
  }
  
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    throw new ApiErrors(400, "Password must contain at least one uppercase letter, one lowercase letter, and one number");
  }
  
  // Username validation
  if (username.length < 3 || username.length > 20) {
    throw new ApiErrors(400, "Username must be between 3 and 20 characters");
  }
  
  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    throw new ApiErrors(400, "Username can only contain letters, numbers, and underscores");
  }
  
  // Check for script injection
  const fields = [fullName, username, email];
  if (fields.some(field => containsScript(field) || containsSQLInjection(field))) {
    throw new ApiErrors(400, "Invalid characters detected in input");
  }
  
  // Sanitize inputs
  req.body.fullName = sanitizeString(fullName);
  req.body.username = sanitizeString(username);
  req.body.email = sanitizeString(email);
  
  next();
};

// Rate limiting helper (basic in-memory implementation)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export const basicRateLimit = (maxRequests: number = 100, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const clientId = req.ip || 'unknown';
    const now = Date.now();
    
    const clientData = requestCounts.get(clientId);
    
    if (!clientData || now > clientData.resetTime) {
      requestCounts.set(clientId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    if (clientData.count >= maxRequests) {
      throw new ApiErrors(429, "Too many requests. Please try again later.");
    }
    
    clientData.count++;
    next();
  };
};