import type { Request } from "express";

export function isSameOriginJsonRequest(
  req: Request,
  canonicalHost: string,
): boolean {
  if (!req.is("application/json")) return false;

  const origin = req.get("origin");
  if (!origin) return false;

  try {
    const expected = canonicalHost.includes("://")
      ? new URL(canonicalHost).host
      : canonicalHost;
    const forwardedProto = req.get("x-forwarded-proto")
      ?.split(",")[0]
      ?.trim();
    const expectedProtocol = `${forwardedProto || req.protocol}:`;
    const parsedOrigin = new URL(origin);
    return (
      parsedOrigin.host.toLowerCase() === expected.toLowerCase() &&
      parsedOrigin.protocol === expectedProtocol
    );
  } catch {
    return false;
  }
}