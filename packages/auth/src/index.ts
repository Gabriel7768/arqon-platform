export {
  AuthClient,
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
} from "./client.js";
export { loadSecret } from "./secret.js";
export { AuthError, isAuthError } from "./errors.js";
export type { AuthErrorCode } from "./errors.js";
export type { AuthPayload, AuthClientConfig } from "./types.js";
export { DEFAULT_EXPIRES_IN, DEFAULT_BCRYPT_ROUNDS } from "./types.js";
