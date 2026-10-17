import { NextFunction, Request, Response } from "express";
import { Role } from "@prisma/client";

/**
 * Role hierarchy: ADMIN > HOST > USER > GUEST.
 * A route protected with requireRole(Role.HOST) accepts HOST and ADMIN,
 * and rejects USER/GUEST (unauthenticated) with 403, per spec:
 * "Host endpoints reject Guest with HTTP 403".
 */
const ROLE_RANK: Record<Role, number> = {
  GUEST: 0,
  USER: 1,
  HOST: 2,
  ADMIN: 3,
};

export function requireRole(minimumRole: Role) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const currentRole: Role = req.user?.role ?? "GUEST";

    if (ROLE_RANK[currentRole] < ROLE_RANK[minimumRole]) {
      res.status(403).json({
        error: {
          code: "FORBIDDEN",
          message: `Requires role >= ${minimumRole}, got ${currentRole}`,
        },
      });
      return;
    }

    next();
  };
}
