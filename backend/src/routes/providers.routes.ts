import { Router } from "express";
import * as providersController from "../controllers/providers.controller";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/", asyncHandler(providersController.listProviders));
router.get("/:id", asyncHandler(providersController.getProvider));

export default router;
