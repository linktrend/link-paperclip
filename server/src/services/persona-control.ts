import { loadConfig } from "../config.js";
import { getGsmProvider } from "../gsm/provider-registry.js";

type JsonRecord = Record<string, unknown>;

type RequestOptions = {
  method?: "GET" | "POST";
  path: string;
  query?: Record<string, string | undefined>;
  body?: JsonRecord;
  includeAuth?: boolean;
};

function buildUrl(baseUrl: string, path: string, query?: Record<string, string | undefined>): string {
  const url = new URL(path, baseUrl.endsWith("/") ? baseUrl : `${baseUrl}/`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (typeof value === "string" && value.length > 0) {
      url.searchParams.set(key, value);
    }
  }
  return url.toString();
}

export function personaControlService() {
  const config = loadConfig();
  const gsmProvider = getGsmProvider(config.gsmProviderId);
  const ingressToken = gsmProvider.getSystemKey("aios_ingress_token");

  async function request<T>(options: RequestOptions): Promise<T> {
    const method = options.method ?? "GET";
    const headers: Record<string, string> = {
      "content-type": "application/json"
    };
    if (options.includeAuth !== false && ingressToken) {
      headers.authorization = `Bearer ${ingressToken}`;
    }

    const response = await fetch(
      buildUrl(config.aiosBaseUrl, options.path, options.query),
      {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined
      }
    );

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const reason =
        typeof payload === "object" &&
        payload !== null &&
        "reason" in payload &&
        typeof (payload as { reason?: unknown }).reason === "string"
          ? (payload as { reason: string }).reason
          : `AIOS request failed (${response.status})`;
      throw new Error(reason);
    }
    return payload as T;
  }

  return {
    tenantId: config.aiosTenantId,

    getReadiness() {
      return request<{ accepted: boolean; summary: JsonRecord; agents: JsonRecord[] }>({
        path: "/persona/readiness",
        query: { tenantId: config.aiosTenantId }
      });
    },

    listEntities(entityKind?: string) {
      return request<{ accepted: boolean; entities: JsonRecord[] }>({
        path: "/persona/entities",
        query: { tenantId: config.aiosTenantId, entityKind }
      });
    },

    listRevisions(entityId?: string) {
      return request<{ accepted: boolean; revisions: JsonRecord[] }>({
        path: "/persona/revisions",
        query: { tenantId: config.aiosTenantId, entityId }
      });
    },

    approvalQueue(status?: "review" | "approved") {
      return request<{ accepted: boolean; queue: JsonRecord[] }>({
        path: "/persona/approvals/queue",
        query: { tenantId: config.aiosTenantId, status }
      });
    },

    getBundle(dprId: string) {
      return request<{ accepted: boolean; bundle: JsonRecord | null }>({
        path: `/persona/bundles/${encodeURIComponent(dprId)}`,
        query: { tenantId: config.aiosTenantId }
      });
    },

    compilePreview(dprId: string) {
      return request<{
        accepted: boolean;
        revisionHash: string;
        sourceRevisionIds: string[];
        layers: JsonRecord[];
        bundle: JsonRecord;
      }>({
        path: "/persona/compile/preview",
        query: { tenantId: config.aiosTenantId, dprId }
      });
    },

    compileDiff(dprId: string) {
      return request<{
        accepted: boolean;
        latestBundleHash: string | null;
        previewHash: string;
        localDiff: JsonRecord[];
        bundleDiff: JsonRecord[];
      }>({
        path: "/persona/compile/diff",
        query: { tenantId: config.aiosTenantId, dprId }
      });
    },

    createEntity(body: JsonRecord) {
      return request<{ accepted: boolean; entity: JsonRecord; revision: JsonRecord; published: JsonRecord | null }>({
        method: "POST",
        path: "/persona/entities",
        body: { ...body, tenantId: config.aiosTenantId }
      });
    },

    createRevision(body: JsonRecord) {
      return request<{ accepted: boolean; revision: JsonRecord }>({
        method: "POST",
        path: "/persona/revisions",
        body: { ...body, tenantId: config.aiosTenantId }
      });
    },

    publishRevision(body: JsonRecord) {
      return request<{ accepted: boolean; published: JsonRecord; compiled: JsonRecord[] }>({
        method: "POST",
        path: "/persona/revisions/publish",
        body: { ...body, tenantId: config.aiosTenantId }
      });
    },

    rollbackRevision(body: JsonRecord) {
      return request<{ accepted: boolean; rollback: JsonRecord }>({
        method: "POST",
        path: "/persona/revisions/rollback",
        body: { ...body, tenantId: config.aiosTenantId }
      });
    },

    importLocal(body: JsonRecord) {
      return request<{ accepted: boolean; importedCount: number; imported: JsonRecord[] }>({
        method: "POST",
        path: "/persona/migration/import-local",
        body: { ...body, tenantId: config.aiosTenantId }
      });
    },

    compileAll(body: JsonRecord) {
      return request<{ accepted: boolean; compiledCount: number; compiled: JsonRecord[] }>({
        method: "POST",
        path: "/persona/migration/compile-all",
        body: { ...body, tenantId: config.aiosTenantId }
      });
    },

    parity() {
      return request<{ accepted: boolean; parity: JsonRecord[]; allMatched: boolean }>({
        path: "/persona/migration/parity",
        query: { tenantId: config.aiosTenantId }
      });
    },

    migrationEvidence() {
      return request<{ accepted: boolean; summary: JsonRecord; approvalsAndRollbacks: JsonRecord[]; agents: JsonRecord[] }>({
        path: "/persona/migration/evidence",
        query: { tenantId: config.aiosTenantId }
      });
    },

    acknowledgeSync(body: JsonRecord) {
      return request<{ accepted: boolean; state: JsonRecord }>({
        method: "POST",
        path: "/persona/sync/ack",
        body: { ...body, tenantId: config.aiosTenantId }
      });
    },

    evaluatePolicy(body: JsonRecord) {
      return request<{ accepted: boolean; decision: string; reason: string; record: JsonRecord }>({
        method: "POST",
        path: "/policies/evaluate",
        body: { ...body, tenantId: config.aiosTenantId }
      });
    },

    setKillSwitch(body: JsonRecord) {
      return request<{ accepted: boolean; state: JsonRecord }>({
        method: "POST",
        path: "/policies/killswitch",
        body: { ...body, tenantId: config.aiosTenantId }
      });
    }
  };
}
