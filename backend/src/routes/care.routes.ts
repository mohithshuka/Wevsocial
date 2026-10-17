import { Router } from "express";
import * as careController from "../controllers/care.controller";
import { requireAuth } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/rbac.middleware";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.post(
  "/bookings",
  requireAuth,
  requireRole("USER"),
  asyncHandler(careController.createBooking)
);
router.get(
  "/bookings",
  requireAuth,
  requireRole("USER"),
  asyncHandler(careController.listMyBookings)
);
router.get(
  "/bookings/:id",
  requireAuth,
  requireRole("USER"),
  asyncHandler(careController.getBooking)
);
router.patch(
  "/bookings/:id/confirm",
  requireAuth,
  requireRole("USER"),
  asyncHandler(careController.confirmBooking)
);

export default router;
