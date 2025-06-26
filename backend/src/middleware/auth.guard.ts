import { Request, Response, NextFunction } from "express";
import { requireAuth } from "./jwt.middleware";

const unprotectedPaths = [
  { method: "POST", path: "/api/auth/login" },
  { method: "POST", path: "/api/auth/register" },
  { method: "POST", path: "/api/mediciones" }, // ESP32 con API key
];

export const globalAuthGuard = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const shouldSkip = unprotectedPaths.some(
    (route) => route.method === req.method && req.path.startsWith(route.path)
  );

  if (shouldSkip) {
    return next();
  }

  requireAuth(req, res, next);
};
