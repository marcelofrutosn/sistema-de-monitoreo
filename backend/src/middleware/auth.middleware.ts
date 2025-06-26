import { Request, Response, NextFunction } from "express";

export const checkApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const key = req.headers["x-api-key"] || req.query.apiKey;
  if (key !== process.env.ESP32_API_KEY) {
    return res.status(403).json({ error: "Invalid API Key" });
  }
  next();
};
