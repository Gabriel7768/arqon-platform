export interface AuthPayload {
  userId: number;
  email: string;
}

export interface AuthClientConfig {
  secret: string;
  expiresIn?: string;
  bcryptRounds?: number;
}

export const DEFAULT_EXPIRES_IN = "7d";
export const DEFAULT_BCRYPT_ROUNDS = 10;
