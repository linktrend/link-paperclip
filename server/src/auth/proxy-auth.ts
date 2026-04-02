import type { IncomingMessage } from "node:http";
import type { Request } from "express";

const PROXY_EMAIL_HEADERS = [
  "x-auth-request-email",
  "x-forwarded-email",
  "x-forwarded-user",
] as const;

function parseTrustedEmails(raw: string | undefined): Set<string> {
  return new Set(
    (raw ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean),
  );
}

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value) return null;
  const parsed = value.split(",")[0]?.trim().toLowerCase();
  if (!parsed || !parsed.includes("@")) return null;
  return parsed;
}

function resolveFromRecord(getValue: (name: string) => string | null | undefined): string | null {
  const allowlist = parseTrustedEmails(process.env.PAPERCLIP_TRUSTED_PROXY_EMAILS);
  if (allowlist.size === 0) return null;

  for (const headerName of PROXY_EMAIL_HEADERS) {
    const candidate = normalizeEmail(getValue(headerName));
    if (!candidate) continue;
    if (allowlist.has(candidate)) return candidate;
  }
  return null;
}

export function resolveTrustedProxyEmailFromExpress(req: Request): string | null {
  return resolveFromRecord((name) => req.header(name) ?? null);
}

export function resolveTrustedProxyEmailFromIncoming(req: IncomingMessage): string | null {
  return resolveFromRecord((name) => {
    const raw = req.headers[name];
    if (!raw) return null;
    if (Array.isArray(raw)) return raw[0] ?? null;
    return raw;
  });
}
