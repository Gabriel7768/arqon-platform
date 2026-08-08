import { AuthError } from "./errors.js";

const ENV_SECRET_NAME = "SESSION_SECRET";

export function loadSecret(): string {
  const v = process.env[ENV_SECRET_NAME];
  if (!v || v.trim().length === 0) {
    throw new AuthError(
      "SECRET_MISSING",
      `${ENV_SECRET_NAME} is not set or empty. Fail-closed: no insecure fallback.`,
    );
  }
  return v;
}
