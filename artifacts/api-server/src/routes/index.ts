import { Router, type IRouter } from "express";
import creativeTreatmentRouter from "./creative-treatment";
import healthRouter from "./health";

const router: IRouter = Router();

router.use(healthRouter);
router.use(creativeTreatmentRouter);

export default router;
