import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import type { IncomingMessage, ServerResponse } from "node:http";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

// Security headers — strict transport, clickjacking, MIME sniffing, etc.
app.use(helmet());

// G1 — Restrict CORS to the known frontend origin(s). WEB_ORIGIN is a
// comma-separated list in production (e.g. "https://app.arqon.com").
// Defaults to localhost for dev. Never reflects arbitrary request origins.
const allowedOrigins = (process.env.WEB_ORIGIN ?? "http://localhost:5173,http://localhost:22333")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, cb) {
      // Allow same-origin / curl (no Origin header) and any whitelisted origin.
      // cb(null, false) omits CORS headers so the browser blocks the read —
      // no need to throw an error (which would surface as a 500).
      if (!origin || allowedOrigins.includes(origin)) {
        cb(null, true);
      } else {
        cb(null, false);
      }
    },
  }),
);

// G4 — Rate limit auth endpoints to mitigate brute-force / registration floods.
// Applied only to /api/auth/* so it does not throttle legitimate API usage.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 30, // 30 requests per window per IP (login + register + me + logout)
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use("/api/auth", authLimiter);

// Stricter limit specifically on login — brute-force target.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 10, // 10 login attempts per window per IP
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
});
app.use("/api/auth/login", loginLimiter);
// Capture the raw body for webhook signature verification. Only stores it
// for the billing webhook route to avoid overhead on every request.
app.use(
  express.json({
    verify: (req: IncomingMessage, _res: ServerResponse, buf: Buffer, _encoding: string) => {
      if (req.url?.startsWith("/api/billing/webhook")) {
        (req as unknown as { rawBody?: string }).rawBody = buf.toString("utf8");
      }
    },
  }),
);
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Final error handler — must be registered AFTER the router. Express
// identifies error-handling middleware by its 4-argument signature.
// Prevents leaking stack traces / internal details in responses
// (the default Express handler exposes them when NODE_ENV !== "production").
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  // Malformed JSON body from express.json() — return a clean 400.
  if (err instanceof SyntaxError && "status" in err && err.status === 400 && "body" in err) {
    res.status(400).json({ error: "Malformed JSON in request body" });
    return;
  }

  logger.error({ err }, "Unhandled request error");
  res.status(500).json({ error: "Internal server error" });
});

export default app;
