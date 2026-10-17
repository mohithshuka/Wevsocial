import { Role } from "@prisma/client";

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  type: "access";
}

export interface RefreshTokenPayload {
  sub: string;
  jti: string;
  type: "refresh";
}

export interface AuthenticatedUser {
  id: string;
  role: Role;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

export type ApiResult<T> = { data: T } | ApiError;
