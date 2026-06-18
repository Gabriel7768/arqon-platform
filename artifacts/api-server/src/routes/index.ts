import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import organizationsRouter from "./organizations";
import dataSourcesRouter from "./data-sources";
import findingsRouter from "./findings";
import recommendationsRouter from "./recommendations";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(organizationsRouter);
router.use(dataSourcesRouter);
router.use(findingsRouter);
router.use(recommendationsRouter);

export default router;
