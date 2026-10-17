import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { AccessTokenPayload } from "../types";

/**
 * Verifies the Bearer access token. On success attaches `req.user`.
 * On expiry/invalidity responds 401 so the mobile client can trigger a
 * silent refresh via /refresh and retry the original request.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: { code: "NO_TOKEN", message: "Missing access token" } });
    return;
  }

  const token = header.slice("Bearer ".length);

  try {
    const decoded = jwt.verify(token, env.jwtAccessSecret) as unknown as AccessTokenPayload;
    if (decoded.type !== "access") {
      throw new Error("wrong token type");
    }
    req.user = { id: decoded.sub, role: decoded.role };
    next();
  } catch {
    res.status(401).json({ error: { code: "TOKEN_EXPIRED", message: "Access token expired or invalid" } });
  }
}

/** Attaches req.user if a valid token is present, but never rejects (for GUEST-accessible routes). */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (header && header.startsWith("Bearer ")) {
    const token = header.slice("Bearer ".length);
    try {
      const decoded = jwt.verify(token, env.jwtAccessSecret) as unknown as AccessTokenPayload;
      if (decoded.type === "access") {
        req.user = { id: decoded.sub, role: decoded.role };
      }
    } catch {
      // ignore - treated as GUEST
    }
  }
  next();
}
