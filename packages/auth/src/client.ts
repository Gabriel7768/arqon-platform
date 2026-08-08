import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { StringValue } from "ms";
import {
  AuthClientConfig,
  AuthPayload,
  DEFAULT_BCRYPT_ROUNDS,
  DEFAULT_EXPIRES_IN,
} from "./types.js";
import { AuthError } from "./errors.js";

export function hashPassword(password: string, rounds = DEFAULT_BCRYPT_ROUNDS): Promise<string> {
  if (!password || password.length === 0) {
    return Promise.reject(new AuthError("HASH_FAILED", "password must be non-empty"));
  }
  return bcrypt.hash(password, rounds).catch((e) => {
    throw new AuthError("HASH_FAILED", `bcrypt hash failed: ${String(e)}`);
  });
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) {
    return Promise.resolve(false);
  }
  return bcrypt.compare(password, hash).catch((e) => {
    throw new AuthError("HASH_INVALID", `bcrypt compare failed: ${String(e)}`);
  });
}

export function signToken(payload: AuthPayload, secret: string, expiresIn: string = DEFAULT_EXPIRES_IN): string {
  if (!secret) {
    throw new AuthError("SECRET_MISSING", "secret is required to sign a token");
  }
  return jwt.sign(payload, secret, { expiresIn: expiresIn as StringValue });
}

export function verifyToken(token: string, secret: string): AuthPayload {
  if (!secret) {
    throw new AuthError("SECRET_MISSING", "secret is required to verify a token");
  }
  try {
    const decoded = jwt.verify(token, secret) as AuthPayload;
    if (typeof decoded.userId !== "number" || typeof decoded.email !== "string") {
      throw new AuthError("TOKEN_INVALID", "token payload missing required fields");
    }
    return decoded;
  } catch (e) {
    if (e instanceof AuthError) throw e;
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.toLowerCase().includes("expired")) {
      throw new AuthError("TOKEN_EXPIRED", "token has expired");
    }
    throw new AuthError("TOKEN_INVALID", `token verification failed: ${msg}`);
  }
}

export class AuthClient {
  private readonly secret: string;
  private readonly expiresIn: string;
  private readonly bcryptRounds: number;

  constructor(config: AuthClientConfig) {
    if (!config.secret || config.secret.trim().length === 0) {
      throw new AuthError("SECRET_MISSING", "AuthClient requires a non-empty secret");
    }
    this.secret = config.secret;
    this.expiresIn = config.expiresIn ?? DEFAULT_EXPIRES_IN;
    this.bcryptRounds = config.bcryptRounds ?? DEFAULT_BCRYPT_ROUNDS;
  }

  hashPassword(password: string): Promise<string> {
    return hashPassword(password, this.bcryptRounds);
  }

  comparePassword(password: string, hash: string): Promise<boolean> {
    return comparePassword(password, hash);
  }

  signToken(payload: AuthPayload): string {
    return signToken(payload, this.secret, this.expiresIn);
  }

  verifyToken(token: string): AuthPayload {
    return verifyToken(token, this.secret);
  }
}
