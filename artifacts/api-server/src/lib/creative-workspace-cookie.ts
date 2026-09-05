import { randomUUID } from "node:crypto";
import type { Request, Response } from "express";

export const WORKSPACE_COOKIE = "creative_workspace";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function getExistingWorkspaceId(req: Request): string | null {
  const candidate = (req.signedCookies as Record<string, unknown> | undefined)?.[
    WORKSPACE_COOKIE
  ];
  return typeof candidate === "string" && UUID_PATTERN.test(candidate)
    ? candidate
    : null;
}

export function getOrCreateWorkspaceId(req: Request, res: Response): string {
  const existing = getExistingWorkspaceId(req);
  if (existing) return existing;

  const workspaceId = randomUUID();
  res.cookie(WORKSPACE_COOKIE, workspaceId, {
    signed: true,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
    maxAge: 365 * 24 * 60 * 60 * 1000,
    path: "/",
  });
  return workspaceId;
}