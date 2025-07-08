# Personal Expenses Tracker API

This is the backend API for the Personal Expenses Tracker application, an academic project for the seventh semester.

## Authors

- Bipin Saud
- Kishor Upadhyaya
- Miraj Aryal

## Table of Contents

- [Project Overview](#project-overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Running the Application](#running-the-application)
- [API Endpoints](#api-endpoints)
  - [User Authentication](#user-authentication)
  - [Dashboard](#dashboard)
  - [Expenses](#expenses)
  - [Income](#income)

## Project Overview

This project is a RESTful API for a personal expense tracker application. It allows users to register, log in, and manage their income and expenses. The API also provides endpoints for a dashboard with financial summaries and analysis.

## Features

- User authentication with JWT (JSON Web Tokens)
- CRUD operations for income and expenses
- Dashboard with financial summaries and cash flow analysis
- Download income and expense data as Excel spreadsheets
- Secure and authenticated routes

## Technologies Used

- **Node.js**: JavaScript runtime environment
- **Express.js**: Web framework for Node.js
- **TypeScript**: Superset of JavaScript that adds static typing
- **MongoDB**: NoSQL database
- **Mongoose**: ODM for MongoDB
- **JWT**: For user authentication
- **bcryptjs**: For password hashing
- **cors**: For enabling Cross-Origin Resource Sharing
- **dotenv**: For managing environment variables
- **multer**: For handling multipart/form-data
- **xlsx**: For creating Excel spreadsheets

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- pnpm (or npm/yarn)
- MongoDB instance (local or cloud)

### Installation

1.  Clone the repository:
    ```bash
    git clone <repository-url>
    ```
2.  Navigate to the project directory:
    ```bash
    cd backend
    ```
3.  Install the dependencies:
    ```bash
    pnpm install
    ```
4.  Create a `.env` file in the root of the project and add the following environment variables:
    ```env
    PORT=8000
    MONGODB_URI=<your-mongodb-uri>
    CLIENT_URL=<your-frontend-url>
    CORS_ORIGIN=*
    ACCESS_TOKEN_SECRET=<your-access-token-secret>
    ACCESS_TOKEN_EXPIRY=1d
    REFRESH_TOKEN_SECRET=<your-refresh-token-secret>
    REFRESH_TOKEN_EXPIRY=10d
    ```

### Running the Application

- **Development:**

  ```bash
  pnpm run dev
  ```

  This will start the development server with live reloading.

- **Production:**
  ```bash
  pnpm run build
  pnpm run start
  ```
  This will first compile the TypeScript code to JavaScript and then start the production server.

## API Endpoints

All API endpoints are prefixed with `/api/v1`.

### User Authentication

- `POST /api/v1/user/register`: Register a new user.
- `POST /api/v1/user/login`: Log in a user.
- `POST /api/v1/user/logout`: Log out a user (requires authentication).
- `GET /api/v1/user/refresh-token`: Refresh the access token.

### Dashboard

- `GET /api/v1/dashboard`: Get complete dashboard data (requires authentication).
- `GET /api/v1/dashboard/summary`: Get financial summary for a date range (requires authentication).
- `GET /api/v1/dashboard/cashflow`: Get cash flow analysis (requires authentication).

### Expenses

- `POST /api/v1/expense`: Add a new expense (requires authentication).
- `GET /api/v1/expense`: Get all expenses (requires authentication).
- `GET /api/v1/expense/stats`: Get expense statistics (requires authentication).
- `GET /api/v1/expense/trends/monthly`: Get monthly expense trends (requires authentication).
- `GET /api/v1/expense/download/excel`: Download expenses as an Excel report (requires authentication).
- `GET /api/v1/expense/category/:category`: Get expenses by category (requires authentication).
- `GET /api/v1/expense/:id`: Get an expense by ID (requires authentication).
- `PUT /api/v1/expense/:id`: Update an expense (requires authentication).
- `DELETE /api/v1/expense/:id`: Delete an expense (requires authentication).

### Income

- `POST /api/v1/income`: Add a new income (requires authentication).
- `GET /api/v1/income`: Get all income (requires authentication).
- `GET /api/v1/income/stats`: Get income statistics (requires authentication).
- `GET /api/v1/income/download/excel`: Download income as an Excel report (requires authentication).
- `GET /api/v1/income/:id`: Get an income by ID (requires authentication).
- `PUT /api/v1/income/:id`: Update an income (requires authentication).
- `DELETE /api/v1/income/:id`: Delete an income (requires authentication).

## Modules

This section provides a detailed breakdown of the project's structure, explaining the purpose of each module within the `src` directory.

### `src/`

This is the main directory containing all the source code for the application.

- **`app.ts`**: The main application file where the Express app is created and configured. It sets up middleware like `cors`, `express.json`, `cookieParser`, and `multer`. It also imports and mounts the main application routes.
- **`index.ts`**: The entry point of the application. It connects to the database and starts the Express server.
- **`constants.ts`**: Defines project-wide constants, such as the database name.

### `src/controllers/`

This directory contains the controller functions that handle the business logic for each API endpoint.

- **`user.controller.ts`**: Handles user registration, login, logout, and token refreshing.
- **`income.controller.ts`**: Manages CRUD operations for income records, including statistics and Excel downloads.
- **`expense.controller.ts`**: Manages CRUD operations for expense records, including statistics, trends, and Excel downloads.
- **`dashboard.controller.ts`**: Provides data for the main dashboard, including financial summaries and cash flow analysis.

### `src/db/`

This directory is responsible for the database connection.

- **`index.ts`**: Contains the `connectDB` function, which establishes a connection to the MongoDB database using Mongoose.

### `src/middleware/`

This directory contains custom middleware functions used in the application.

- **`auth.middleware.ts`**: The `verifyJWT` middleware is used to protect routes by verifying the JSON Web Token (JWT) sent in the request.

### `src/models/`

This directory defines the Mongoose schemas and models for the database collections.

- **`user.models.ts`**: Defines the `User` schema, including methods for password hashing and generating JWTs.
- **`income.models.ts`**: Defines the `Income` schema for storing income records.
- **`expense.models.ts`**: Defines the `Expense` schema for storing expense records.

### `src/routes/`

This directory contains the Express router definitions for each feature.

- **`user.routes.ts`**: Defines the API routes for user authentication (`/register`, `/login`, etc.).
- **`income.routes.ts`**: Defines the API routes for income-related operations.
- **`expense.routes.ts`**: Defines the API routes for expense-related operations.
- **`dashboard.routes.ts`**: Defines the API routes for the dashboard.

### `src/types/`

This directory contains TypeScript type definitions and interfaces used throughout the application.

- **`common.types.ts`**: Defines common types, such as the `AuthenticatedRequest` interface.
- **`dashboard.types.ts`**: Defines the complex types and interfaces for the dashboard data structures.

### `src/utils/`

This directory contains utility functions and classes that are used across the application.

- **`asyncHandler.ts`**: A higher-order function that wraps async route handlers to catch errors and pass them to the Express error handling middleware.
- **`ApiErrors.ts`**: A custom `Error` class for creating consistent API error responses.
- **`ApiResponse.ts`**: A class for creating consistent API success responses.
