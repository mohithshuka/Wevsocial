import { Router } from "express";
import * as sportsController from "../controllers/sports.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get("/activities", asyncHandler(sportsController.listActivities));
router.post(
  "/bookings",
  requireAuth,
  requireRole("USER"),
  asyncHandler(sportsController.createBooking)
);
router.get(
  "/bookings",
  requireAuth,
  requireRole("USER"),
  asyncHandler(sportsController.listMyBookings)
);

export default router;
