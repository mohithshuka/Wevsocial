import { NextFunction, Request, Response } from "express";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction): void {
  // eslint-disable-next-line no-console
  console.error(err);
  const message = err instanceof Error ? err.message : "Unexpected error";
  res.status(500).json({ error: { code: "INTERNAL_ERROR", message } });
}

export function notFoundHandler(_req: Request, res: Response): void {
  res.status(404).json({ error: { code: "ROUTE_NOT_FOUND", message: "Route not found" } });
}
