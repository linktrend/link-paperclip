import { logger } from "../middleware/logger.js";
import { loadConfig } from "../config.js";
import { getGsmProvider } from "../gsm/provider-registry.js";
import type { GsmProvider } from "../gsm/types.js";
import { z } from "zod";

type UpsertMissionInput = {
  missionId: string;
  tenantId: string;
  status: string;
  agentId: string;
  invocationSource: string | null;
  triggerDetail: string | null;
  wakeupRequestId: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  metadata: Record<string, unknown>;
};

type MissionAuditSyncService = {
  upsertMission(input: UpsertMissionInput): Promise<void>;
  logAuditRun(input: {
    runId: string;
    taskId: string;
    dprId: string;
    tenantId: string;
  }): Promise<void>;
};

const uuidSchema = z.string().uuid();

export function createMissionAuditSyncService(): MissionAuditSyncService {
  const config = loadConfig();
  const endpoint = config.linkbrainSharedMemoryRpcUrl;
  const gsmProvider: GsmProvider = getGsmProvider(config.gsmProviderId);

  async function upsertMission(input: UpsertMissionInput): Promise<void> {
    if (!config.linkbrainMissionAuditEnabled) return;
    if (!endpoint) return;
    if (!uuidSchema.safeParse(input.tenantId).success) {
      logger.warn(
        { missionId: input.missionId, tenantId: input.tenantId },
        "Skipping mission upsert RPC: p_tenant_id is not a valid UUID",
      );
      return;
    }

    const systemApiKey = gsmProvider.getSystemKey("linkbrain_system_api");
    const supabaseServiceRole = gsmProvider.getSystemKey("supabase_service_role");

    const headers: Record<string, string> = {
      "content-type": "application/json",
    };
    if (systemApiKey) headers["x-api-key"] = systemApiKey;
    if (supabaseServiceRole) {
      headers.apikey = supabaseServiceRole;
      headers.authorization = `Bearer ${supabaseServiceRole}`;
    }

    const body = {
      jsonrpc: "2.0",
      id: `paperclip:${input.missionId}:${Date.now()}`,
      method: "shared_memory.upsert_mission",
      params: {
        p_mission_key: input.missionId,
        p_goal:
          (typeof input.metadata.mission_goal === "string" && input.metadata.mission_goal.trim().length > 0
            ? input.metadata.mission_goal
            : typeof input.metadata.goal === "string" && input.metadata.goal.trim().length > 0
              ? input.metadata.goal
              : "Mission dispatch"),
        p_status: input.status,
        p_tenant_id: input.tenantId,
      },
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        logger.warn(
          {
            endpoint,
            missionId: input.missionId,
            tenantId: input.tenantId,
            status: input.status,
            responseStatus: response.status,
            responseStatusText: response.statusText,
          },
          "LiNKbrain shared_memory.upsert_mission sync failed",
        );
        return;
      }
      const responseBody = (await response.json().catch(() => null)) as
        | { error?: { code?: number; message?: string } }
        | null;
      if (responseBody?.error) {
        logger.warn(
          {
            endpoint,
            missionId: input.missionId,
            tenantId: input.tenantId,
            status: input.status,
            rpcErrorCode: responseBody.error.code ?? null,
            rpcErrorMessage: responseBody.error.message ?? null,
          },
          "LiNKbrain shared_memory.upsert_mission returned RPC error",
        );
      }
    } catch (err) {
      logger.warn(
        {
          err,
          endpoint,
          missionId: input.missionId,
          tenantId: input.tenantId,
          status: input.status,
        },
        "LiNKbrain shared_memory.upsert_mission sync errored",
      );
    }
  }

  async function logAuditRun(input: {
    runId: string;
    taskId: string;
    dprId: string;
    tenantId: string;
  }): Promise<void> {
    if (!config.linkbrainMissionAuditEnabled) return;
    if (!endpoint) return;
    if (!uuidSchema.safeParse(input.tenantId).success) {
      logger.warn(
        { runId: input.runId, tenantId: input.tenantId },
        "Skipping log_audit_run RPC: p_tenant_id is not a valid UUID",
      );
      return;
    }

    const systemApiKey = gsmProvider.getSystemKey("linkbrain_system_api");
    const supabaseServiceRole = gsmProvider.getSystemKey("supabase_service_role");
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (systemApiKey) headers["x-api-key"] = systemApiKey;
    if (supabaseServiceRole) {
      headers.apikey = supabaseServiceRole;
      headers.authorization = `Bearer ${supabaseServiceRole}`;
    }

    // Explicit LiNKbrain mapping: DPR V3 identifier is passed as p_agent_id.
    const auditPayload = {
      p_run_id: input.runId,
      p_task_id: input.taskId,
      p_agent_id: input.dprId,
      p_status: "dispatched",
      p_tenant_id: input.tenantId,
    };
    const body = {
      jsonrpc: "2.0",
      id: `paperclip:audit:${input.runId}:${Date.now()}`,
      method: "log_audit_run",
      params: auditPayload,
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        logger.warn(
          {
            endpoint,
            runId: input.runId,
            taskId: input.taskId,
            dprId: input.dprId,
            tenantId: input.tenantId,
            responseStatus: response.status,
            responseStatusText: response.statusText,
          },
          "LiNKbrain log_audit_run RPC failed",
        );
        return;
      }
      const responseBody = (await response.json().catch(() => null)) as
        | { error?: { code?: number; message?: string } }
        | null;
      if (responseBody?.error) {
        logger.warn(
          {
            endpoint,
            runId: input.runId,
            taskId: input.taskId,
            dprId: input.dprId,
            tenantId: input.tenantId,
            rpcErrorCode: responseBody.error.code ?? null,
            rpcErrorMessage: responseBody.error.message ?? null,
          },
          "LiNKbrain log_audit_run RPC returned error",
        );
      }
    } catch (err) {
      logger.warn(
        { err, endpoint, runId: input.runId, taskId: input.taskId, dprId: input.dprId, tenantId: input.tenantId },
        "LiNKbrain log_audit_run RPC errored",
      );
    }
  }

  return { upsertMission, logAuditRun };
}
