import {
  AuthClient,
  loadSecret,
  type AuthPayload,
} from "@workspace/auth";

// Fail-closed: loadSecret() throws AuthError("SECRET_MISSING") when
// SESSION_SECRET is unset or empty — no insecure "arqon-dev-secret" fallback.
// The secret is resolved lazily so test harnesses can set SESSION_SECRET
// before the first auth operation.
let _client: AuthClient | null = null;

function client(): AuthClient {
  if (!_client) {
    _client = new AuthClient({ secret: loadSecret() });
  }
  return _client;
}

export function hashPassword(password: string): Promise<string> {
  return client().hashPassword(password);
}

export function comparePassword(password: string, hash: string): Promise<boolean> {
  return client().comparePassword(password, hash);
}

export function signToken(payload: AuthPayload): string {
  return client().signToken(payload);
}

export function verifyToken(token: string): AuthPayload {
  return client().verifyToken(token);
}
