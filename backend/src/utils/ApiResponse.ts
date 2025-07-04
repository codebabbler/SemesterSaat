class ApiResponse<T = any> {
  statusCode: number;
  success: boolean;
  message: string;
  data: T;
  constructor(statusCode: number, data: T, message: string) {
    this.statusCode = statusCode;
    this.data = data;
    this.message = message;
    this.success = statusCode < 400;
  }
}

export default ApiResponse;
