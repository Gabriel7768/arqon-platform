export type I18nErrorCode =
  | "CONFIG_INVALID"
  | "LOAD_FAILED"
  | "CONTEXT_MISSING";

export class I18nError extends Error {
  readonly code: I18nErrorCode;
  constructor(code: I18nErrorCode, message: string) {
    super(message);
    this.name = "I18nError";
    this.code = code;
  }
}

export function isI18nError(e: unknown): e is I18nError {
  return e instanceof I18nError;
}
