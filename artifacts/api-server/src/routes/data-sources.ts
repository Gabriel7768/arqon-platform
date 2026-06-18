import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import multer from "multer";
import path from "path";
import fs from "fs";
import { db, dataSourcesTable } from "@workspace/db";
import {
  ListDataSourcesParams,
  CreateDataSourceParams,
  CreateDataSourceBody,
  GetDataSourceParams,
  DeleteDataSourceParams,
  UploadDataSourceFileParams,
  AnalyzeDataSourceParams,
} from "@workspace/api-zod";
import { authenticate, type AuthRequest } from "../middlewares/authenticate";
import { analyzeDataSource } from "../lib/revenue-engine";
import { logger } from "../lib/logger";

const workspaceRoot = process.cwd().endsWith(path.join("artifacts", "api-server"))
  ? path.resolve(process.cwd(), "../..")
  : process.cwd();

const uploadsDir = path.resolve(workspaceRoot, "artifacts/api-server/uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}-${file.originalname}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

const router: IRouter = Router();
router.use(authenticate);

function formatDs(ds: typeof dataSourcesTable.$inferSelect) {
  return {
    id: ds.id,
    orgId: ds.orgId,
    name: ds.name,
    type: ds.type,
    status: ds.status,
    description: ds.description ?? null,
    fileName: ds.fileName ?? null,
    rowCount: ds.rowCount ?? null,
    lastAnalyzedAt: ds.lastAnalyzedAt ? ds.lastAnalyzedAt.toISOString() : null,
    errorMessage: ds.errorMessage ?? null,
    createdAt: ds.createdAt.toISOString(),
    updatedAt: ds.updatedAt.toISOString(),
  };
}

router.get("/organizations/:orgId/data-sources", async (req, res): Promise<void> => {
  const params = ListDataSourcesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const sources = await db.select().from(dataSourcesTable).where(eq(dataSourcesTable.orgId, params.data.orgId));
  res.json(sources.map(formatDs));
});

router.post("/organizations/:orgId/data-sources", async (req, res): Promise<void> => {
  const params = CreateDataSourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CreateDataSourceBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [ds] = await db.insert(dataSourcesTable).values({
    orgId: params.data.orgId,
    name: parsed.data.name,
    type: parsed.data.type,
    description: parsed.data.description,
    status: "pending",
  }).returning();

  res.status(201).json(formatDs(ds));
});

router.get("/organizations/:orgId/data-sources/:id", async (req, res): Promise<void> => {
  const params = GetDataSourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [ds] = await db.select().from(dataSourcesTable).where(
    and(eq(dataSourcesTable.id, params.data.id), eq(dataSourcesTable.orgId, params.data.orgId))
  );

  if (!ds) {
    res.status(404).json({ error: "Data source not found" });
    return;
  }

  res.json(formatDs(ds));
});

router.delete("/organizations/:orgId/data-sources/:id", async (req, res): Promise<void> => {
  const params = DeleteDataSourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [ds] = await db.delete(dataSourcesTable).where(
    and(eq(dataSourcesTable.id, params.data.id), eq(dataSourcesTable.orgId, params.data.orgId))
  ).returning();

  if (!ds) {
    res.status(404).json({ error: "Data source not found" });
    return;
  }

  res.sendStatus(204);
});

router.post(
  "/organizations/:orgId/data-sources/:id/upload",
  upload.single("file"),
  async (req, res): Promise<void> => {
    const params = UploadDataSourceFileParams.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({ error: params.error.message });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const [ds] = await db.select().from(dataSourcesTable).where(
      and(eq(dataSourcesTable.id, params.data.id), eq(dataSourcesTable.orgId, params.data.orgId))
    );

    if (!ds) {
      res.status(404).json({ error: "Data source not found" });
      return;
    }

    await db.update(dataSourcesTable)
      .set({ status: "processing", fileName: req.file.originalname })
      .where(eq(dataSourcesTable.id, ds.id));

    res.json(formatDs({ ...ds, status: "processing", fileName: req.file.originalname }));

    setImmediate(async () => {
      try {
        await analyzeDataSource(ds.id, ds.orgId, req.file!.path);
        req.log.info({ dataSourceId: ds.id }, "Analysis complete");
      } catch (err) {
        logger.error({ err, dataSourceId: ds.id }, "Background analysis failed");
      }
    });
  }
);

router.post("/organizations/:orgId/data-sources/:id/analyze", async (req, res): Promise<void> => {
  const params = AnalyzeDataSourceParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [ds] = await db.select().from(dataSourcesTable).where(
    and(eq(dataSourcesTable.id, params.data.id), eq(dataSourcesTable.orgId, params.data.orgId))
  );

  if (!ds || !ds.fileName) {
    res.status(404).json({ error: "Data source not found or no file uploaded" });
    return;
  }

  const filePath = path.join(uploadsDir, ds.fileName);
  const files = fs.readdirSync(uploadsDir).filter((f) => f.includes(ds.fileName!.replace(/.*-/, "")));
  const actualFile = files.length > 0 ? path.join(uploadsDir, files[files.length - 1]) : null;

  if (!actualFile || !fs.existsSync(actualFile)) {
    res.status(404).json({ error: "Uploaded file not found" });
    return;
  }

  await db.update(dataSourcesTable).set({ status: "processing" }).where(eq(dataSourcesTable.id, ds.id));

  const result = await analyzeDataSource(ds.id, ds.orgId, actualFile);
  res.json({ dataSourceId: ds.id, ...result });
});

export default router;
