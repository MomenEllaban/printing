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

interface UpstreamError {
  code?: number | string;
  status?: number;
  message?: string;
  response?: { status?: number };
  errors?: { reason?: string; message?: string }[];
  cause?: unknown;
}

interface ErrorDetails {
  httpStatus?: number;
  code?: string;
  reason?: string;
  message?: string;
}

const NETWORK_CODES = new Set([
  "ENOTFOUND",
  "ECONNREFUSED",
  "ECONNRESET",
  "ECONNABORTED",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "UND_ERR_CONNECT_TIMEOUT",
  "ERR_NETWORK",
]);

function readErrorDetails(error: unknown): ErrorDetails {
  if (!error || typeof error !== "object") return {};
  const candidate = error as UpstreamError;
  const cause =
    candidate.cause && typeof candidate.cause === "object"
      ? (candidate.cause as UpstreamError)
      : undefined;

  const numericCode = typeof candidate.code === "number" ? candidate.code : undefined;
  const causeNumericCode = typeof cause?.code === "number" ? cause.code : undefined;
  const httpStatus =
    numericCode ??
    causeNumericCode ??
    candidate.status ??
    candidate.response?.status ??
    cause?.status ??
    cause?.response?.status;

  const firstError = candidate.errors?.[0] ?? cause?.errors?.[0];
  const stringCode =
    typeof candidate.code === "string"
      ? candidate.code
      : typeof cause?.code === "string"
        ? cause.code
        : undefined;

  return {
    httpStatus,
    code: stringCode,
    reason: firstError?.reason,
    message: cause?.message ?? candidate.message ?? firstError?.message,
  };
}

function isDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { name?: string; code?: unknown };
  return (
    candidate.name?.startsWith("PrismaClient") === true ||
    (typeof candidate.code === "string" && /^P\d{4}$/.test(candidate.code))
  );
}

export function toErrorResponse(error: unknown): { status: number; body: { error: string; message: string } } {
  if (error instanceof AppError) {
    const message = error.expose ? error.message : "The operation could not be completed. Please try again.";
    return { status: error.status, body: { error: error.code, message } };
  }

  const details = readErrorDetails(error);

  if (details.code && NETWORK_CODES.has(details.code)) {
    return {
      status: 502,
      body: {
        error: "driveUnavailable",
        message: "Could not reach Google Drive. Check the server connection and try again.",
      },
    };
  }

  if (details.httpStatus === 401) {
    return {
      status: 401,
      body: { error: "tokenRefresh", message: "Google authorization expired. Reconnect your account." },
    };
  }

  if (details.httpStatus === 403) {
    const message = details.message?.toLowerCase() ?? "";
    if (
      details.reason === "accessNotConfigured" ||
      message.includes("has not been used") ||
      message.includes("accessnotconfigured") ||
      message.includes("api is not enabled")
    ) {
      return {
        status: 503,
        body: {
          error: "driveApiDisabled",
          message: "The Google Drive API is not enabled for this project. Enable it in Google Cloud and try again.",
        },
      };
    }
    if (
      details.reason === "rateLimitExceeded" ||
      details.reason === "userRateLimitExceeded" ||
      message.includes("quota")
    ) {
      return {
        status: 429,
        body: { error: "quota", message: "Google Drive API quota exceeded. Try again later." },
      };
    }
    return {
      status: 403,
      body: {
        error: "drivePermission",
        message: "Google Drive denied access. Reconnect your account and grant the requested Drive permissions.",
      },
    };
  }

  if (details.httpStatus === 404) {
    return { status: 404, body: { error: "fileNotFound", message: "File not found or you do not have access." } };
  }

  if (details.httpStatus === 429) {
    return {
      status: 429,
      body: { error: "quota", message: "Google Drive API quota exceeded. Try again later." },
    };
  }

  if (details.httpStatus === 400) {
    return {
      status: 502,
      body: {
        error: "driveBadRequest",
        message:
          "Google Drive rejected the request. Check the configured root folder and the app settings, then try again.",
      },
    };
  }

  if (details.httpStatus && details.httpStatus >= 500) {
    return {
      status: 502,
      body: {
        error: "driveUnavailable",
        message: "Google Drive is temporarily unavailable. Try again in a moment.",
      },
    };
  }

  if (isDatabaseError(error)) {
    return {
      status: 503,
      body: { error: "db", message: "The database is currently unavailable. Try again in a moment." },
    };
  }

  console.error("[api] unexpected error", error instanceof Error ? error.message : error);
  return { status: 500, body: { error: "generic", message: "Unexpected server error. Please try again." } };
}
