import { test, describe, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import {
  AuthClient,
  hashPassword,
  comparePassword,
  signToken,
  verifyToken,
  loadSecret,
  AuthError,
} from "../src/index.js";

const TEST_SECRET = "test-secret-do-not-use-in-prod";

describe("hashPassword", () => {
  test("returns a bcrypt hash distinct from input", async () => {
    const h = await hashPassword("hunter2");
    assert.ok(h.startsWith("$2"), "bcrypt hash should start with $2");
    assert.notEqual(h, "hunter2");
  });

  test("same password yields different hashes (salt) but both verify", async () => {
    const h1 = await hashPassword("hunter2");
    const h2 = await hashPassword("hunter2");
    assert.notEqual(h1, h2);
    assert.equal(await comparePassword("hunter2", h1), true);
    assert.equal(await comparePassword("hunter2", h2), true);
  });

  test("rejects empty password with HASH_FAILED", async () => {
    await assert.rejects(() => hashPassword(""), (e: unknown) => {
      assert.ok(e instanceof AuthError);
      assert.equal((e as AuthError).code, "HASH_FAILED");
      return true;
    });
  });
});

describe("comparePassword", () => {
  test("correct password returns true", async () => {
    const h = await hashPassword("correct-horse");
    assert.equal(await comparePassword("correct-horse", h), true);
  });

  test("wrong password returns false", async () => {
    const h = await hashPassword("correct-horse");
    assert.equal(await comparePassword("wrong", h), false);
  });

  test("empty inputs return false (no throw)", async () => {
    assert.equal(await comparePassword("", "x"), false);
    assert.equal(await comparePassword("x", ""), false);
  });

  test("malformed hash returns false (no throw, fail-safe)", async () => {
    // bcryptjs returns false for malformed hashes rather than throwing —
    // this is fail-safe (never claims a match). AUTH-RT §5.2 allows throw OR false.
    const result = await comparePassword("x", "not-a-bcrypt-hash");
    assert.equal(result, false);
  });
});

describe("signToken", () => {
  test("returns a 3-part JWT string", () => {
    const t = signToken({ userId: 1, email: "a@b.io" }, TEST_SECRET);
    const parts = t.split(".");
    assert.equal(parts.length, 3, "JWT must have header.payload.signature");
  });

  test("missing secret throws SECRET_MISSING", () => {
    assert.throws(
      () => signToken({ userId: 1, email: "a@b.io" }, ""),
      (e: unknown) => {
        assert.ok(e instanceof AuthError);
        assert.equal((e as AuthError).code, "SECRET_MISSING");
        return true;
      },
    );
  });
});

describe("verifyToken", () => {
  test("round-trip: sign then verify returns original payload", () => {
    const payload = { userId: 42, email: "user@arqon.io" };
    const t = signToken(payload, TEST_SECRET);
    const out = verifyToken(t, TEST_SECRET);
    assert.equal(out.userId, 42);
    assert.equal(out.email, "user@arqon.io");
  });

  test("token signed with different secret is rejected (TOKEN_INVALID)", () => {
    const t = signToken({ userId: 1, email: "a@b.io" }, "other-secret");
    assert.throws(
      () => verifyToken(t, TEST_SECRET),
      (e: unknown) => {
        assert.ok(e instanceof AuthError);
        assert.equal((e as AuthError).code, "TOKEN_INVALID");
        return true;
      },
    );
  });

  test("malformed token is rejected (TOKEN_INVALID)", () => {
    assert.throws(
      () => verifyToken("not.a.valid.jwt", TEST_SECRET),
      (e: unknown) => {
        assert.ok(e instanceof AuthError);
        assert.equal((e as AuthError).code, "TOKEN_INVALID");
        return true;
      },
    );
  });

  test("expired token is rejected (TOKEN_EXPIRED)", () => {
    // sign with immediate expiry
    const t = signToken({ userId: 1, email: "a@b.io" }, TEST_SECRET, "-1s");
    assert.throws(
      () => verifyToken(t, TEST_SECRET),
      (e: unknown) => {
        assert.ok(e instanceof AuthError);
        assert.equal((e as AuthError).code, "TOKEN_EXPIRED");
        return true;
      },
    );
  });

  test("missing secret throws SECRET_MISSING", () => {
    const t = signToken({ userId: 1, email: "a@b.io" }, TEST_SECRET);
    assert.throws(
      () => verifyToken(t, ""),
      (e: unknown) => {
        assert.ok(e instanceof AuthError);
        assert.equal((e as AuthError).code, "SECRET_MISSING");
        return true;
      },
    );
  });

  test("fails closed: never returns a partial payload on invalid input", () => {
    assert.throws(() => verifyToken("garbage", TEST_SECRET));
    assert.throws(() => verifyToken("a.b.c", TEST_SECRET));
  });
});

describe("loadSecret", () => {
  const SAVED = process.env.SESSION_SECRET;
  beforeEach(() => { delete process.env.SESSION_SECRET; });
  afterEach(() => {
    if (SAVED === undefined) delete process.env.SESSION_SECRET;
    else process.env.SESSION_SECRET = SAVED;
  });

  test("returns the value when SESSION_SECRET is set", () => {
    process.env.SESSION_SECRET = "my-prod-secret";
    assert.equal(loadSecret(), "my-prod-secret");
  });

  test("throws SECRET_MISSING when unset (fail-closed, no fallback)", () => {
    assert.throws(
      () => loadSecret(),
      (e: unknown) => {
        assert.ok(e instanceof AuthError);
        assert.equal((e as AuthError).code, "SECRET_MISSING");
        return true;
      },
    );
  });

  test("throws SECRET_MISSING when empty string (fail-closed)", () => {
    process.env.SESSION_SECRET = "   ";
    assert.throws(
      () => loadSecret(),
      (e: unknown) => {
        assert.ok(e instanceof AuthError);
        assert.equal((e as AuthError).code, "SECRET_MISSING");
        return true;
      },
    );
  });
});

describe("AuthClient", () => {
  test("constructs with a valid config and round-trips", () => {
    const c = new AuthClient({ secret: TEST_SECRET });
    const t = c.signToken({ userId: 7, email: "x@y.io" });
    const out = c.verifyToken(t);
    assert.equal(out.userId, 7);
    assert.equal(out.email, "x@y.io");
  });

  test("rejects construction with empty secret (fail-closed)", () => {
    assert.throws(
      () => new AuthClient({ secret: "" }),
      (e: unknown) => {
        assert.ok(e instanceof AuthError);
        assert.equal((e as AuthError).code, "SECRET_MISSING");
        return true;
      },
    );
  });

  test("hashPassword and comparePassword work via the client", async () => {
    const c = new AuthClient({ secret: TEST_SECRET });
    const h = await c.hashPassword("pw");
    assert.equal(await c.comparePassword("pw", h), true);
    assert.equal(await c.comparePassword("nope", h), false);
  });

  test("verifyToken via client rejects cross-secret tokens", () => {
    const c1 = new AuthClient({ secret: "s1" });
    const c2 = new AuthClient({ secret: "s2" });
    const t = c1.signToken({ userId: 1, email: "a@b.io" });
    assert.throws(
      () => c2.verifyToken(t),
      (e: unknown) => {
        assert.ok(e instanceof AuthError);
        assert.equal((e as AuthError).code, "TOKEN_INVALID");
        return true;
      },
    );
  });
});
