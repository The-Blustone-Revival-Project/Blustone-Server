import express, { type NextFunction, type Request, type Response } from "express";
import crypto from "node:crypto";
import { appendFileSync } from "node:fs";

export function applyBodyParsers(app: express.Express): void {
  app.use(express.json({ limit: "16mb", type: ["application/json", "application/*+json"] }));
  app.use(express.urlencoded({ extended: true, limit: "16mb" }));
  app.use(express.raw({ type: "application/octet-stream", limit: "16mb" }));
}

export function requestLogging(): RequestHandler {
  return (req, res, next) => {
    const requestId = crypto.randomUUID();
    res.setHeader("X-Request-Id", requestId);
    res.setHeader("Cache-Control", "no-store");
    const started = Date.now();
    const body = req.body;
    const bodyKeys = Buffer.isBuffer(body)
      ? `raw:${body.length}`
      : body && typeof body === "object"
        ? Object.keys(body as Record<string, unknown>).filter((key) => !/(token|secret|password|signature|otp|vs_token)/i.test(key)).sort().join(",")
        : "";
    const safeBody = body && typeof body === "object" && !Buffer.isBuffer(body)
      ? Object.fromEntries(Object.entries(body as Record<string, unknown>)
        .filter(([key]) => !/(token|secret|password|signature|cookie|authorization|otp|vs_token)/i.test(key))
        .map(([key, value]) => [key, String(value).slice(0, 160)]))
      : {};
    const headerNames = Object.keys(req.headers).filter((name) => !/(authorization|token|secret|signature|cookie)/i.test(name)).sort().join(",");
    const securityHeaderNames = Object.keys(req.headers).filter((name) => /(pv|secure|signature)/i.test(name)).sort().join(",");
    console.info(`${requestId} ${req.method} ${req.path} request content_type=${req.headers["content-type"] ?? ""} body_keys=${bodyKeys} body_values=${JSON.stringify(safeBody)} header_names=${headerNames} security_header_names=${securityHeaderNames}`);
    const traceFile = process.env.BLUSTONE_REQUEST_LOG_FILE;
    if (traceFile) {
      try { appendFileSync(traceFile, `${new Date().toISOString()} ${req.method} ${req.path}\n`); } catch { /* diagnostics must never break requests */ }
    }
    res.on("finish", () => console.info(`${requestId} ${req.method} ${req.path} -> ${res.statusCode} ${Date.now() - started}ms`));
    next();
  };
}

export function notFound(): RequestHandler {
  return (req, res) => res.status(404).json({ error: "unknown route", path: req.path });
}

export function errorHandler(): (error: unknown, req: Request, res: Response, next: NextFunction) => void {
  return (error, req, res, _next) => {
    const message = error instanceof Error ? error.message : "Unhandled server error";
    console.error(`${req.method} ${req.path} unhandled_error=${message}`);
    if (res.headersSent) return;
    res.status(500).json({ error: "local server failure", message });
  };
}

type RequestHandler = (req: Request, res: Response, next: NextFunction) => void;
