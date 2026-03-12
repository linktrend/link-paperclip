import { randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { conflict } from "../errors.js";

const DPR_V3_PATTERN = /^INT-(MNG|EXE)-\d{6}-[0-9A-F]{4}-\w+$/;

export const MissionPayloadSchema = z.object({
  missionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  dprId: z.string().regex(DPR_V3_PATTERN),
  goal: z.string().min(1),
  status: z.enum(["active", "paused", "handover_pending", "archived"]),
  runId: z.string().min(12),
  taskId: z.string().min(8),
});

export type MissionPayload = z.infer<typeof MissionPayloadSchema>;

export function readTenantIdValue(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function assertAndSealTenantId(
  expectedTenantId: string,
  scopeLabel: string,
  value: Record<string, unknown> | null,
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...(value ?? {}) };
  const incomingTenantId =
    readTenantIdValue(out.tenant_id) ?? readTenantIdValue(out.tenantId);
  if (incomingTenantId && incomingTenantId !== expectedTenantId) {
    throw conflict(`Tenant isolation violation in ${scopeLabel}: tenant_id is immutable`);
  }
  out.tenant_id = expectedTenantId;
  out.tenantId = expectedTenantId;
  return out;
}

function readNonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeStatus(value: unknown): MissionPayload["status"] {
  if (
    value === "active" ||
    value === "paused" ||
    value === "handover_pending" ||
    value === "archived"
  ) {
    return value;
  }
  return "active";
}

function ensureMissionId(value: unknown): string {
  const asString = readNonEmptyString(value);
  if (asString && z.string().uuid().safeParse(asString).success) return asString;
  return randomUUID();
}

function ensureDprId(value: unknown, taskId: string): string {
  const asString = readNonEmptyString(value);
  if (asString) {
    if (DPR_V3_PATTERN.test(asString)) return asString;
    throw conflict("Mission payload failed DPR V3 validation", {
      dprId: ["Invalid DPR V3 identifier format"],
    });
  }

  const dateCode = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const shortDate = dateCode.slice(0, 6);
  const hex = randomBytes(2).toString("hex").toUpperCase();
  const suffix = taskId.replace(/[^\w]/g, "_").slice(0, 24) || "mission";
  return `INT-MNG-${shortDate}-${hex}-${suffix}`;
}

function ensureTaskId(value: unknown, fallback: string): string {
  const asString = readNonEmptyString(value) ?? fallback;
  return asString.length >= 8 ? asString : `${asString}__task`;
}

export function buildValidatedMissionPayload(input: {
  missionId?: unknown;
  tenantId: string;
  dprId?: unknown;
  goal?: unknown;
  status?: unknown;
  runId: string;
  taskId?: unknown;
}): MissionPayload {
  const taskId = ensureTaskId(input.taskId, input.runId);
  const payloadCandidate = {
    missionId: ensureMissionId(input.missionId),
    tenantId: input.tenantId,
    dprId: ensureDprId(input.dprId, taskId),
    goal: readNonEmptyString(input.goal) ?? "Mission dispatch",
    status: normalizeStatus(input.status),
    runId: input.runId,
    taskId,
  };

  const parsed = MissionPayloadSchema.safeParse(payloadCandidate);
  if (!parsed.success) {
    throw conflict("Mission payload failed DPR V3 validation", parsed.error.flatten());
  }
  return parsed.data;
}
