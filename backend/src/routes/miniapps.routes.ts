import { Router } from "express";
import { prisma } from "../config/prisma";
import { asyncHandler } from "../utils/asyncHandler";

const router = Router();

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const apps = await prisma.miniApp.findMany({ where: { enabled: true } });
    res.status(200).json({ data: apps });
  })
);

export default router;
