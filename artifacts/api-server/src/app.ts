import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
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
app.use(cors());
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
