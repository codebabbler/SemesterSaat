# API Endpoints Documentation

## Overview
This document provides a comprehensive overview of all API endpoints provided by the backend and their usage status in the frontend application.

---

## 🔐 Authentication Endpoints (`/api/v1/user`)

### Available Backend Endpoints

| Method | Endpoint | Description | Frontend Usage |
|--------|----------|-------------|----------------|
| `POST` | `/register` | Register new user | ✅ **Used** |
| `POST` | `/login` | User login | ✅ **Used** |
| `POST` | `/logout` | User logout (requires auth) | ✅ **Used** |
| `GET` | `/refresh-token` | Refresh access token | ✅ **Used** |
| `GET` | `/profile` | Get user profile (requires auth) | ✅ **Used** |
| `PUT` | `/profile` | Update user profile (requires auth) | ❌ **Not Used** |
| `POST` | `/change-password` | Change user password (requires auth) | ❌ **Not Used** |

**Frontend Implementation Files:**
- Registration: `frontend/src/app/signup/page.tsx:70`
- Login: `frontend/src/app/login/page.tsx:51`
- Logout: `frontend/src/components/Layouts/SideMenu.tsx:37`
- Profile fetch: `frontend/src/hooks/useUserAuth.ts:31`
- Token refresh: `frontend/src/utils/axiosInstance.ts:76`

---

## 📊 Dashboard Endpoints (`/api/v1/dashboard`)

### Available Backend Endpoints

| Method | Endpoint | Description | Frontend Usage |
|--------|----------|-------------|----------------|
| `GET` | `/` | Get complete dashboard data (requires auth) | ✅ **Used** |
| `GET` | `/summary` | Get financial summary for date range (requires auth) | ❌ **Not Used** |
| `GET` | `/cashflow` | Get cash flow analysis (requires auth) | ❌ **Not Used** |

**Frontend Implementation Files:**
- Dashboard data: `frontend/src/app/dashboard/page.tsx:110`

---

## 💸 Expense Endpoints (`/api/v1/expense`)

### Available Backend Endpoints

| Method | Endpoint | Description | Frontend Usage |
|--------|----------|-------------|----------------|
| `POST` | `/` | Add new expense (requires auth) | ✅ **Used** |
| `GET` | `/` | Get all expenses with pagination (requires auth) | ✅ **Used** |
| `GET` | `/:id` | Get expense by ID (requires auth) | ❌ **Not Used** |
| `PUT` | `/:id` | Update expense (requires auth) | ❌ **Not Used** |
| `DELETE` | `/:id` | Delete expense (requires auth) | ✅ **Used** |
| `GET` | `/stats` | Get expense statistics (requires auth) | ❌ **Not Used** |
| `GET` | `/trends/monthly` | Get monthly expense trends (requires auth) | ❌ **Not Used** |
| `GET` | `/download/excel` | Download Excel report (requires auth) | ✅ **Used** |
| `GET` | `/category/:category` | Get expenses by category (requires auth) | ❌ **Not Used** |

**Frontend Implementation Files:**
- Add expense: `frontend/src/app/expense/page.tsx:87`
- Get all expenses: `frontend/src/app/expense/page.tsx:53`
- Delete expense: `frontend/src/app/expense/page.tsx:109`
- Download Excel: `frontend/src/app/expense/page.tsx:127`

---

## 💰 Income Endpoints (`/api/v1/income`)

### Available Backend Endpoints

| Method | Endpoint | Description | Frontend Usage |
|--------|----------|-------------|----------------|
| `POST` | `/` | Add new income (requires auth) | ✅ **Used** |
| `GET` | `/` | Get all income with pagination (requires auth) | ✅ **Used** |
| `GET` | `/:id` | Get income by ID (requires auth) | ❌ **Not Used** |
| `PUT` | `/:id` | Update income (requires auth) | ❌ **Not Used** |
| `DELETE` | `/:id` | Delete income (requires auth) | ✅ **Used** |
| `GET` | `/stats` | Get income statistics (requires auth) | ❌ **Not Used** |
| `GET` | `/download/excel` | Download Excel report (requires auth) | ✅ **Used** |

**Frontend Implementation Files:**
- Add income: `frontend/src/app/income/page.tsx:87`
- Get all income: `frontend/src/app/income/page.tsx:53`
- Delete income: `frontend/src/app/income/page.tsx:109`
- Download Excel: `frontend/src/app/income/page.tsx:127`

---

## 🚨 Anomaly Detection Endpoints (`/api/v1/anomaly`)

### Available Backend Endpoints

| Method | Endpoint | Description | Frontend Usage |
|--------|----------|-------------|----------------|
| `GET` | `/transactions` | Get anomalous transactions (requires auth) | ❌ **Not Used** |
| `GET` | `/stats` | Get anomaly detection statistics (requires auth) | ❌ **Not Used** |
| `POST` | `/reset/category` | Reset anomaly stats for specific category (requires auth) | ❌ **Not Used** |
| `POST` | `/reset/all` | Reset all anomaly stats for transaction type (requires auth) | ❌ **Not Used** |

**Query Parameters for `/transactions`:**
- `transactionType` (optional): Filter by 'expense' or 'income'
- `page` (optional): Page number for pagination (default: 1)
- `limit` (optional): Items per page (default: 10, max: 100)

**Query Parameters for `/stats`:**
- `transactionType` (optional): Filter by 'expense' or 'income'

**Request Body for `/reset/category`:**
```json
{
  "category": "string",
  "transactionType": "expense" | "income"
}
```

**Request Body for `/reset/all`:**
```json
{
  "transactionType": "expense" | "income"
}
```

**Enhanced Transaction Creation:**
- Both expense and income creation now automatically include anomaly detection
- Response includes `anomalyDetection` object with detection results

---

## 📋 Summary

### ✅ Implemented Features (17/22 endpoints)
- User registration and login
- User logout and token refresh
- User profile fetching
- Dashboard data overview
- Basic expense CRUD (Create, Read, Delete)
- Basic income CRUD (Create, Read, Delete)
- Excel export for both expenses and income
- Anomaly detection for all transactions (automatic)
- Anomaly analysis and reporting endpoints

### ❌ Missing Frontend Implementation (9/22 endpoints)

#### High Priority
1. **User Profile Management**
   - `PUT /api/v1/user/profile` - Update user profile
   - `POST /api/v1/user/change-password` - Change password

2. **Individual Record Management**
   - `GET /api/v1/expense/:id` - View single expense details
   - `PUT /api/v1/expense/:id` - Edit existing expense
   - `GET /api/v1/income/:id` - View single income details  
   - `PUT /api/v1/income/:id` - Edit existing income

#### Medium Priority
3. **Analytics & Reporting**
   - `GET /api/v1/dashboard/summary` - Financial summary for specific date ranges
   - `GET /api/v1/dashboard/cashflow` - Cash flow analysis
   - `GET /api/v1/expense/stats` - Expense statistics
   - `GET /api/v1/income/stats` - Income statistics
   - `GET /api/v1/expense/trends/monthly` - Monthly expense trends

4. **Anomaly Detection UI (4 endpoints)**
   - `GET /api/v1/anomaly/transactions` - View anomalous transactions
   - `GET /api/v1/anomaly/stats` - Anomaly detection statistics
   - `POST /api/v1/anomaly/reset/category` - Reset category stats
   - `POST /api/v1/anomaly/reset/all` - Reset all stats

#### Lower Priority
5. **Advanced Filtering**
   - `GET /api/v1/expense/category/:category` - Filter expenses by category

---

## 🔧 Additional Notes

### Frontend API Configuration
- **Base URL**: `http://localhost:8000`
- **API Paths**: Centrally managed in `frontend/src/utils/apiPaths.ts`
- **HTTP Client**: Axios with automatic token refresh in `frontend/src/utils/axiosInstance.ts`
- **Authentication**: Cookie-based with automatic redirect on 401 errors

### Missing API Endpoints Referenced in Frontend
The frontend references one endpoint that doesn't exist in the backend:
- `API_PATHS.IMAGE.UPLOAD_IMAGE` - Used in `frontend/src/utils/uploadImage.ts:14`

This suggests an image upload feature is planned but not yet implemented in the backend.