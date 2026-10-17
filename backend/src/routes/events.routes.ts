import { Router } from "express";
import * as eventsController from "../controllers/events.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(eventsController.listEvents));

export default router;
