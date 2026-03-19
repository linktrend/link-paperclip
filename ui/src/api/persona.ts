import { api } from "./client";

type JsonRecord = Record<string, unknown>;

function withCompany(companyId: string, path: string) {
  return `/companies/${encodeURIComponent(companyId)}${path}`;
}

export const personaApi = {
  readiness(companyId: string) {
    return api.get<{
      accepted: boolean;
      tenantId: string;
      summary: JsonRecord;
      agents: JsonRecord[];
    }>(withCompany(companyId, "/persona/readiness"));
  },

  entities(companyId: string, entityKind?: string) {
    const suffix = entityKind ? `?entityKind=${encodeURIComponent(entityKind)}` : "";
    return api.get<{ accepted: boolean; entities: JsonRecord[] }>(
      withCompany(companyId, `/persona/entities${suffix}`)
    );
  },

  revisions(companyId: string, entityId?: string) {
    const suffix = entityId ? `?entityId=${encodeURIComponent(entityId)}` : "";
    return api.get<{ accepted: boolean; revisions: JsonRecord[] }>(
      withCompany(companyId, `/persona/revisions${suffix}`)
    );
  },

  approvalQueue(companyId: string, status?: "review" | "approved") {
    const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
    return api.get<{ accepted: boolean; queue: JsonRecord[] }>(
      withCompany(companyId, `/persona/approvals/queue${suffix}`)
    );
  },

  bundle(companyId: string, dprId: string) {
    return api.get<{ accepted: boolean; bundle: JsonRecord | null }>(
      withCompany(companyId, `/persona/bundles/${encodeURIComponent(dprId)}`)
    );
  },

  compilePreview(companyId: string, dprId: string) {
    return api.get<{
      accepted: boolean;
      revisionHash: string;
      sourceRevisionIds: string[];
      layers: JsonRecord[];
      bundle: JsonRecord;
    }>(withCompany(companyId, `/persona/compile/preview?dprId=${encodeURIComponent(dprId)}`));
  },

  compileDiff(companyId: string, dprId: string) {
    return api.get<{
      accepted: boolean;
      latestBundleHash: string | null;
      previewHash: string;
      localDiff: JsonRecord[];
      bundleDiff: JsonRecord[];
    }>(withCompany(companyId, `/persona/compile/diff?dprId=${encodeURIComponent(dprId)}`));
  },

  createEntity(companyId: string, payload: JsonRecord) {
    return api.post<{ accepted: boolean; entity: JsonRecord; revision: JsonRecord; published: JsonRecord | null }>(
      withCompany(companyId, "/persona/entities"),
      payload
    );
  },

  createRevision(companyId: string, payload: JsonRecord) {
    return api.post<{ accepted: boolean; revision: JsonRecord }>(
      withCompany(companyId, "/persona/revisions"),
      payload
    );
  },

  publishRevision(companyId: string, payload: JsonRecord) {
    return api.post<{ accepted: boolean; published: JsonRecord; compiled: JsonRecord[] }>(
      withCompany(companyId, "/persona/revisions/publish"),
      payload
    );
  },

  rollbackRevision(companyId: string, payload: JsonRecord) {
    return api.post<{ accepted: boolean; rollback: JsonRecord }>(
      withCompany(companyId, "/persona/revisions/rollback"),
      payload
    );
  },

  importLocal(companyId: string, payload: JsonRecord) {
    return api.post<{ accepted: boolean; importedCount: number; imported: JsonRecord[] }>(
      withCompany(companyId, "/persona/migration/import-local"),
      payload
    );
  },

  applyV1(companyId: string, payload: JsonRecord) {
    return api.post<{ accepted: boolean; seededCount: number; seeded: JsonRecord[]; compile: JsonRecord | null }>(
      withCompany(companyId, "/persona/migration/apply-v1"),
      payload
    );
  },

  compileAll(companyId: string, payload: JsonRecord) {
    return api.post<{ accepted: boolean; compiledCount: number; compiled: JsonRecord[] }>(
      withCompany(companyId, "/persona/migration/compile-all"),
      payload
    );
  },

  parity(companyId: string) {
    return api.get<{ accepted: boolean; parity: JsonRecord[]; allMatched: boolean }>(
      withCompany(companyId, "/persona/migration/parity")
    );
  },

  migrationEvidence(companyId: string) {
    return api.get<{ accepted: boolean; summary: JsonRecord; approvalsAndRollbacks: JsonRecord[]; agents: JsonRecord[] }>(
      withCompany(companyId, "/persona/migration/evidence")
    );
  },

  syncAck(companyId: string, payload: JsonRecord) {
    return api.post<{ accepted: boolean; state: JsonRecord }>(
      withCompany(companyId, "/persona/sync/ack"),
      payload
    );
  },

  evaluatePolicy(companyId: string, payload: JsonRecord) {
    return api.post<{ accepted: boolean; decision: string; reason: string; record: JsonRecord }>(
      withCompany(companyId, "/policies/evaluate"),
      payload
    );
  },

  setKillSwitch(companyId: string, payload: JsonRecord) {
    return api.post<{ accepted: boolean; state: JsonRecord }>(
      withCompany(companyId, "/policies/killswitch"),
      payload
    );
  }
};
