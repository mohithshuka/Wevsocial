import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import crypto from "crypto";
import { Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { env } from "../config/env";
import { AccessTokenPayload, RefreshTokenPayload } from "../types";

const BCRYPT_ROUNDS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function signAccessToken(userId: string, role: Role): string {
  const payload: AccessTokenPayload = { sub: userId, role, type: "access" };
  return jwt.sign(payload, env.jwtAccessSecret, {
    expiresIn: env.jwtAccessExpiresIn,
  });
}

function signRefreshToken(userId: string, jti: string): string {
  const payload: RefreshTokenPayload = { sub: userId, jti, type: "refresh" };
  return jwt.sign(payload, env.jwtRefreshSecret, {
    expiresIn: env.jwtRefreshExpiresIn,
  });
}

function expiryDateFromNow(): Date {
  const days = 30;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

/** Issues a brand-new refresh token and persists its hash (never the raw token). */
export async function issueRefreshToken(userId: string): Promise<string> {
  const jti = uuidv4();
  const token = signRefreshToken(userId, jti);
  await prisma.refreshToken.create({
    data: {
      id: jti,
      tokenHash: hashToken(token),
      userId,
      expiresAt: expiryDateFromNow(),
    },
  });
  return token;
}

export interface RotationResult {
  accessToken: string;
  refreshToken: string;
}

/**
 * Refresh Token Rotation: the presented refresh token is verified, checked
 * against the stored hash, and — if valid and unused — is revoked while a
 * brand new refresh token + access token pair is issued. Reuse of an already
 * revoked token indicates token theft and revokes the entire chain.
 */
export async function rotateRefreshToken(
  presentedToken: string
): Promise<RotationResult> {
  let decoded: RefreshTokenPayload;
  try {
    decoded = jwt.verify(
      presentedToken,
      env.jwtRefreshSecret
    ) as unknown as RefreshTokenPayload;
  } catch {
    throw new AuthError("INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  }

  const stored = await prisma.refreshToken.findUnique({
    where: { id: decoded.jti },
  });

  if (!stored || stored.tokenHash !== hashToken(presentedToken)) {
    throw new AuthError("INVALID_REFRESH_TOKEN", "Refresh token not recognized");
  }

  if (stored.revoked) {
    // Token reuse detected -> revoke the whole family for safety.
    await prisma.refreshToken.updateMany({
      where: { userId: stored.userId },
      data: { revoked: true },
    });
    throw new AuthError("REFRESH_TOKEN_REUSE", "Refresh token reuse detected");
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) {
    throw new AuthError("USER_NOT_FOUND", "User no longer exists");
  }

  const newRefreshToken = await issueRefreshToken(user.id);
  const newJti = jwt.decode(newRefreshToken) as unknown as RefreshTokenPayload;

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true, replacedBy: newJti.jti },
  });

  const accessToken = signAccessToken(user.id, user.role);

  return { accessToken, refreshToken: newRefreshToken };
}

export async function revokeRefreshToken(presentedToken: string): Promise<void> {
  try {
    const decoded = jwt.verify(
      presentedToken,
      env.jwtRefreshSecret
    ) as unknown as RefreshTokenPayload;
    await prisma.refreshToken.updateMany({
      where: { id: decoded.jti },
      data: { revoked: true },
    });
  } catch {
    // Already invalid/expired — logout is a no-op in that case.
  }
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}
