export class AppError extends Error {
  status: number;
  code: string;
  expose: boolean;

  constructor(message: string, options?: { status?: number; code?: string; expose?: boolean }) {
    super(message);
    this.name = "AppError";
    this.status = options?.status ?? 400;
    this.code = options?.code ?? "invalidRequest";
    this.expose = options?.expose ?? true;
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = "Invalid session") {
    super(message, { status: 401, code: "unauthorized" });
    this.name = "UnauthorizedError";
  }
}

export class DriveNotConnectedError extends AppError {
  constructor(message = "Google Drive is not connected") {
    super(message, { status: 409, code: "driveNotConnected" });
    this.name = "DriveNotConnectedError";
  }
}

export class GoogleNotConfiguredError extends AppError {
  constructor(message = "Google OAuth credentials are missing") {
    super(message, { status: 503, code: "googleNotConfigured" });
    this.name = "GoogleNotConfiguredError";
  }
}

export function toErrorResponse(error: unknown): { status: number; body: { error: string; message: string } } {
  if (error instanceof AppError) {
    return { status: error.status, body: { error: error.code, message: error.message } };
  }
  if (error && typeof error === "object") {
    const candidate = error as { code?: number; message?: string; errors?: { reason?: string }[] };
    const reason = candidate.errors?.[0]?.reason;
    if (candidate.code === 401) {
      return { status: 401, body: { error: "tokenRefresh", message: "Google authorization expired" } };
    }
    if (candidate.code === 403 && reason === "rateLimitExceeded") {
      return { status: 429, body: { error: "quota", message: "Drive API quota exceeded" } };
    }
    if (candidate.code === 404) {
      return { status: 404, body: { error: "fileNotFound", message: "File not found" } };
    }
  }
  console.error("[api] unexpected error", error);
  return { status: 500, body: { error: "generic", message: "Unexpected server error" } };
}
