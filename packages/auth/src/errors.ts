export type AuthErrorCode =
  | "SECRET_MISSING"
  | "TOKEN_INVALID"
  | "TOKEN_EXPIRED"
  | "HASH_FAILED"
  | "HASH_INVALID";

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export function isAuthError(e: unknown): e is AuthError {
  return e instanceof AuthError;
}
