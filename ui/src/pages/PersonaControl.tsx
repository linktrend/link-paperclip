import { type ReactNode, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { personaApi } from "@/api/persona";

type JsonRecord = Record<string, unknown>;

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function PersonaControl() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  const [entityKind, setEntityKind] = useState("persona");
  const [approvalStatus, setApprovalStatus] = useState<"review" | "approved" | "">("");
  const [selectedEntityId, setSelectedEntityId] = useState("");
  const [compileDprId, setCompileDprId] = useState("");
  const [operationOutput, setOperationOutput] = useState<string>("");
  const [policyPackage, setPolicyPackage] = useState("");

  const [createForm, setCreateForm] = useState({
    contentKind: "soul",
    scopeKind: "agent_override",
    scopeKey: "",
    title: "",
    body: "",
    publishImmediately: false
  });
  const [publishForm, setPublishForm] = useState({
    entityId: "",
    revisionId: "",
    reason: "",
    compileTargets: ""
  });
  const [rollbackForm, setRollbackForm] = useState({
    entityId: "",
    targetRevisionId: "",
    reason: ""
  });
  const [policyForm, setPolicyForm] = useState({
    runId: "",
    taskId: "",
    dprId: "",
    destination: "",
    dataSensitivity: "low"
  });
  const [killSwitchForm, setKillSwitchForm] = useState({
    runId: "",
    taskId: "",
    actorDprId: "",
    scope: "tenant",
    targetKey: "00000000-0000-0000-0000-000000000001",
    state: "active",
    reason: ""
  });

  const readinessQuery = useQuery({
    queryKey: ["persona", "readiness", selectedCompanyId],
    queryFn: () => personaApi.readiness(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId)
  });

  const entitiesQuery = useQuery({
    queryKey: ["persona", "entities", selectedCompanyId, entityKind],
    queryFn: () => personaApi.entities(selectedCompanyId!, entityKind),
    enabled: Boolean(selectedCompanyId)
  });

  const revisionsQuery = useQuery({
    queryKey: ["persona", "revisions", selectedCompanyId, selectedEntityId],
    queryFn: () => personaApi.revisions(selectedCompanyId!, selectedEntityId || undefined),
    enabled: Boolean(selectedCompanyId)
  });

  const approvalQueueQuery = useQuery({
    queryKey: ["persona", "approvalQueue", selectedCompanyId, approvalStatus],
    queryFn: () => personaApi.approvalQueue(selectedCompanyId!, approvalStatus || undefined),
    enabled: Boolean(selectedCompanyId)
  });

  const selectedEntity = useMemo(() => {
    const entities = entitiesQuery.data?.entities ?? [];
    if (!selectedEntityId) return null;
    return entities.find((entity) => asString(entity.id) === selectedEntityId) ?? null;
  }, [entitiesQuery.data?.entities, selectedEntityId]);

  const invalidatePersonaQueries = () => {
    if (!selectedCompanyId) return;
    void queryClient.invalidateQueries({ queryKey: ["persona", "readiness", selectedCompanyId] });
    void queryClient.invalidateQueries({ queryKey: ["persona", "entities", selectedCompanyId] });
    void queryClient.invalidateQueries({ queryKey: ["persona", "revisions", selectedCompanyId] });
  };

  const createEntityMutation = useMutation({
    mutationFn: (payload: JsonRecord) => personaApi.createEntity(selectedCompanyId!, payload),
    onSuccess: (data) => {
      setOperationOutput(JSON.stringify(data, null, 2));
      invalidatePersonaQueries();
    }
  });

  const publishMutation = useMutation({
    mutationFn: (payload: JsonRecord) => personaApi.publishRevision(selectedCompanyId!, payload),
    onSuccess: (data) => {
      setOperationOutput(JSON.stringify(data, null, 2));
      invalidatePersonaQueries();
    }
  });

  const rollbackMutation = useMutation({
    mutationFn: (payload: JsonRecord) => personaApi.rollbackRevision(selectedCompanyId!, payload),
    onSuccess: (data) => {
      setOperationOutput(JSON.stringify(data, null, 2));
      invalidatePersonaQueries();
    }
  });

  const importMutation = useMutation({
    mutationFn: () => personaApi.importLocal(selectedCompanyId!, { publishImported: false }),
    onSuccess: (data) => {
      setOperationOutput(JSON.stringify(data, null, 2));
      invalidatePersonaQueries();
    }
  });

  const applyV1Mutation = useMutation({
    mutationFn: () =>
      personaApi.applyV1(selectedCompanyId!, {
        includeBirthDateInUserFile: false,
        policyPackage: policyPackage.trim() || undefined,
        compileAfterPublish: true
      }),
    onSuccess: (data) => {
      setOperationOutput(JSON.stringify(data, null, 2));
      invalidatePersonaQueries();
    }
  });

  const compileMutation = useMutation({
    mutationFn: () => personaApi.compileAll(selectedCompanyId!, { publishImported: false }),
    onSuccess: (data) => {
      setOperationOutput(JSON.stringify(data, null, 2));
      invalidatePersonaQueries();
    }
  });

  const parityMutation = useMutation({
    mutationFn: () => personaApi.parity(selectedCompanyId!),
    onSuccess: (data) => {
      setOperationOutput(JSON.stringify(data, null, 2));
      invalidatePersonaQueries();
    }
  });

  const previewMutation = useMutation({
    mutationFn: (dprId: string) => personaApi.compilePreview(selectedCompanyId!, dprId),
    onSuccess: (data) => {
      setOperationOutput(JSON.stringify(data, null, 2));
    }
  });

  const diffMutation = useMutation({
    mutationFn: (dprId: string) => personaApi.compileDiff(selectedCompanyId!, dprId),
    onSuccess: (data) => {
      setOperationOutput(JSON.stringify(data, null, 2));
    }
  });

  const evidenceMutation = useMutation({
    mutationFn: () => personaApi.migrationEvidence(selectedCompanyId!),
    onSuccess: (data) => {
      setOperationOutput(JSON.stringify(data, null, 2));
    }
  });

  const policyMutation = useMutation({
    mutationFn: (payload: JsonRecord) => personaApi.evaluatePolicy(selectedCompanyId!, payload),
    onSuccess: (data) => {
      setOperationOutput(JSON.stringify(data, null, 2));
      invalidatePersonaQueries();
    }
  });

  const killSwitchMutation = useMutation({
    mutationFn: (payload: JsonRecord) => personaApi.setKillSwitch(selectedCompanyId!, payload),
    onSuccess: (data) => {
      setOperationOutput(JSON.stringify(data, null, 2));
      invalidatePersonaQueries();
    }
  });

  if (!selectedCompanyId) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <h1 className="text-xl font-semibold">Persona Control Plane</h1>
        <p className="mt-2 text-sm text-muted-foreground">Select a company to manage personas and policies.</p>
      </div>
    );
  }

  const readinessSummary = readinessQuery.data?.summary ?? {};
  const entities = entitiesQuery.data?.entities ?? [];
  const revisions = revisionsQuery.data?.revisions ?? [];
  const approvalQueue = approvalQueueQuery.data?.queue ?? [];

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 py-6">
      <section className="rounded-lg border border-border bg-card p-4">
        <h1 className="text-xl font-semibold">Persona Control Plane</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          LiNKbrain-backed persona + policy control with compile, publish, rollback, parity, and guardrail actions.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
          <Metric label="Total Agents" value={String(readinessSummary.totalAgents ?? "-")} />
          <Metric label="Ready Agents" value={String(readinessSummary.readyAgents ?? "-")} />
          <Metric label="Published Bundles" value={String(readinessSummary.publishedBundles ?? "-")} />
          <Metric label="Ack Bundles" value={String(readinessSummary.acknowledgedBundles ?? "-")} />
          <Metric label="Policy Assigned" value={String(readinessSummary.policyAssignedAgents ?? "-")} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2 className="font-semibold">Entities</h2>
            <div className="flex items-center gap-2">
              <select
                className="rounded border border-border bg-background px-2 py-1 text-sm"
                value={entityKind}
                onChange={(event) => setEntityKind(event.target.value)}
              >
                <option value="persona">persona</option>
                <option value="policy">policy</option>
                <option value="guideline">guideline</option>
                <option value="guardrail">guardrail</option>
                <option value="sop">sop</option>
              </select>
              <select
                className="rounded border border-border bg-background px-2 py-1 text-sm"
                value={approvalStatus}
                onChange={(event) => setApprovalStatus(event.target.value as "review" | "approved" | "")}
              >
                <option value="">queue: review+approved</option>
                <option value="review">queue: review</option>
                <option value="approved">queue: approved</option>
              </select>
            </div>
          </div>
          <div className="max-h-72 overflow-auto rounded border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-2">Title</th>
                  <th className="px-2 py-2">Scope</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {entities.map((entity) => {
                  const id = asString(entity.id);
                  return (
                    <tr
                      key={id}
                      className={`cursor-pointer border-t border-border ${id === selectedEntityId ? "bg-accent/40" : ""}`}
                      onClick={() => {
                        setSelectedEntityId(id);
                        setPublishForm((prev) => ({ ...prev, entityId: id }));
                        setRollbackForm((prev) => ({ ...prev, entityId: id }));
                      }}
                    >
                      <td className="px-2 py-2">{asString(entity.title, "untitled")}</td>
                      <td className="px-2 py-2">{`${asString(entity.scope_kind)}/${asString(entity.scope_key)}`}</td>
                      <td className="px-2 py-2">{asString(entity.status, "-")}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">Revisions {selectedEntity ? `(${asString(selectedEntity.title)})` : ""}</h2>
          <div className="max-h-72 overflow-auto rounded border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-2">Revision</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Hash</th>
                </tr>
              </thead>
              <tbody>
                {revisions.map((revision) => (
                  <tr
                    key={asString(revision.id)}
                    className="cursor-pointer border-t border-border"
                    onClick={() => {
                      setPublishForm((prev) => ({ ...prev, revisionId: asString(revision.id) }));
                      setRollbackForm((prev) => ({ ...prev, targetRevisionId: asString(revision.id) }));
                    }}
                  >
                    <td className="px-2 py-2">{String(revision.revision_number ?? "-")}</td>
                    <td className="px-2 py-2">{asString(revision.status, "-")}</td>
                    <td className="px-2 py-2">{asString(revision.content_hash, "-").slice(0, 12)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-3 font-semibold">Approval Queue</h2>
        <div className="max-h-56 overflow-auto rounded border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-2">Entity</th>
                <th className="px-2 py-2">Revision</th>
                <th className="px-2 py-2">Status</th>
                <th className="px-2 py-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {approvalQueue.map((entry, index) => {
                const revision = (entry.revision ?? {}) as JsonRecord;
                const entity = (entry.entity ?? {}) as JsonRecord;
                return (
                  <tr key={`${asString(revision.id)}-${index}`} className="border-t border-border">
                    <td className="px-2 py-2">{asString(entity.title, asString(revision.entity_id, "-"))}</td>
                    <td className="px-2 py-2">{asString(revision.id, "-").slice(0, 12)}</td>
                    <td className="px-2 py-2">{asString(revision.status, "-")}</td>
                    <td className="px-2 py-2">{asString(revision.created_at, "-").slice(0, 19)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form
          className="rounded-lg border border-border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            createEntityMutation.mutate({
              entityKind,
              contentKind: createForm.contentKind,
              scopeKind: createForm.scopeKind,
              scopeKey: createForm.scopeKey,
              title: createForm.title,
              body: createForm.body,
              publishImmediately: createForm.publishImmediately
            });
          }}
        >
          <h2 className="mb-3 font-semibold">Create Entity + Revision</h2>
          <FormRow label="Content Kind">
            <input
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
              value={createForm.contentKind}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, contentKind: event.target.value }))}
            />
          </FormRow>
          <FormRow label="Scope Kind">
            <select
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
              value={createForm.scopeKind}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, scopeKind: event.target.value }))}
            >
              <option value="global">global</option>
              <option value="type">type</option>
              <option value="role">role</option>
              <option value="agent_override">agent_override</option>
              <option value="memory_seed">memory_seed</option>
              <option value="runtime_rules">runtime_rules</option>
            </select>
          </FormRow>
          <FormRow label="Scope Key">
            <input
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
              value={createForm.scopeKey}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, scopeKey: event.target.value }))}
            />
          </FormRow>
          <FormRow label="Title">
            <input
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
              value={createForm.title}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </FormRow>
          <FormRow label="Body">
            <textarea
              className="h-24 w-full rounded border border-border bg-background px-2 py-1 text-sm"
              value={createForm.body}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, body: event.target.value }))}
            />
          </FormRow>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={createForm.publishImmediately}
              onChange={(event) => setCreateForm((prev) => ({ ...prev, publishImmediately: event.target.checked }))}
            />
            Publish immediately
          </label>
          <button
            type="submit"
            className="mt-3 rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
            disabled={createEntityMutation.isPending}
          >
            Create
          </button>
        </form>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="mb-3 font-semibold">Publish / Rollback</h2>
          <form
            className="space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              publishMutation.mutate({
                entityId: publishForm.entityId,
                revisionId: publishForm.revisionId,
                reason: publishForm.reason,
                compileTargets: publishForm.compileTargets
                  .split(",")
                  .map((value) => value.trim())
                  .filter((value) => value.length > 0)
              });
            }}
          >
            <FormRow label="Entity ID">
              <input
                className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={publishForm.entityId}
                onChange={(event) => setPublishForm((prev) => ({ ...prev, entityId: event.target.value }))}
              />
            </FormRow>
            <FormRow label="Revision ID">
              <input
                className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={publishForm.revisionId}
                onChange={(event) => setPublishForm((prev) => ({ ...prev, revisionId: event.target.value }))}
              />
            </FormRow>
            <FormRow label="Compile Targets (CSV)">
              <input
                className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={publishForm.compileTargets}
                onChange={(event) => setPublishForm((prev) => ({ ...prev, compileTargets: event.target.value }))}
              />
            </FormRow>
            <button
              type="submit"
              className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
              disabled={publishMutation.isPending}
            >
              Publish Revision
            </button>
          </form>

          <form
            className="mt-4 space-y-2"
            onSubmit={(event) => {
              event.preventDefault();
              rollbackMutation.mutate(rollbackForm);
            }}
          >
            <FormRow label="Rollback Entity ID">
              <input
                className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={rollbackForm.entityId}
                onChange={(event) => setRollbackForm((prev) => ({ ...prev, entityId: event.target.value }))}
              />
            </FormRow>
            <FormRow label="Target Revision ID">
              <input
                className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={rollbackForm.targetRevisionId}
                onChange={(event) => setRollbackForm((prev) => ({ ...prev, targetRevisionId: event.target.value }))}
              />
            </FormRow>
            <FormRow label="Reason">
              <input
                className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
                value={rollbackForm.reason}
                onChange={(event) => setRollbackForm((prev) => ({ ...prev, reason: event.target.value }))}
              />
            </FormRow>
            <button
              type="submit"
              className="rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
              disabled={rollbackMutation.isPending}
            >
              Rollback
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="font-semibold">Migration Ops</h3>
          <div className="mt-3">
            <label className="text-xs text-muted-foreground">Policy Package (optional)</label>
            <input
              className="mt-1 w-full rounded border border-border bg-background px-2 py-1 text-sm"
              value={policyPackage}
              onChange={(event) => setPolicyPackage(event.target.value)}
              placeholder="agent_persona_policy_YYMMDD"
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button className="rounded border border-border px-3 py-1 text-sm" onClick={() => applyV1Mutation.mutate()}>
              Apply v1 + Compile
            </button>
            <button className="rounded border border-border px-3 py-1 text-sm" onClick={() => importMutation.mutate()}>
              Import Local
            </button>
            <button className="rounded border border-border px-3 py-1 text-sm" onClick={() => compileMutation.mutate()}>
              Compile All
            </button>
            <button className="rounded border border-border px-3 py-1 text-sm" onClick={() => parityMutation.mutate()}>
              Parity Check
            </button>
            <button className="rounded border border-border px-3 py-1 text-sm" onClick={() => evidenceMutation.mutate()}>
              Evidence
            </button>
          </div>
          <div className="mt-4 grid gap-2">
            <label className="text-xs text-muted-foreground">Compile Preview / Diff DPR</label>
            <div className="flex flex-wrap gap-2">
              <input
                className="min-w-[16rem] flex-1 rounded border border-border bg-background px-2 py-1 text-sm"
                value={compileDprId}
                onChange={(event) => setCompileDprId(event.target.value)}
                placeholder="INT-...."
              />
              <button
                className="rounded border border-border px-3 py-1 text-sm"
                onClick={() => previewMutation.mutate(compileDprId)}
                disabled={!compileDprId.trim() || previewMutation.isPending}
              >
                Preview
              </button>
              <button
                className="rounded border border-border px-3 py-1 text-sm"
                onClick={() => diffMutation.mutate(compileDprId)}
                disabled={!compileDprId.trim() || diffMutation.isPending}
              >
                Diff
              </button>
            </div>
          </div>
        </div>

        <form
          className="rounded-lg border border-border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            policyMutation.mutate({
              ...policyForm,
              allowlist: [],
              metadata: { source: "paperclip_ui" }
            });
          }}
        >
          <h3 className="font-semibold">Policy Evaluate</h3>
          <FormRow label="Run / Task">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded border border-border bg-background px-2 py-1 text-sm"
                value={policyForm.runId}
                onChange={(event) => setPolicyForm((prev) => ({ ...prev, runId: event.target.value }))}
              />
              <input
                className="rounded border border-border bg-background px-2 py-1 text-sm"
                value={policyForm.taskId}
                onChange={(event) => setPolicyForm((prev) => ({ ...prev, taskId: event.target.value }))}
              />
            </div>
          </FormRow>
          <FormRow label="DPR / Destination">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded border border-border bg-background px-2 py-1 text-sm"
                value={policyForm.dprId}
                onChange={(event) => setPolicyForm((prev) => ({ ...prev, dprId: event.target.value }))}
              />
              <input
                className="rounded border border-border bg-background px-2 py-1 text-sm"
                value={policyForm.destination}
                onChange={(event) => setPolicyForm((prev) => ({ ...prev, destination: event.target.value }))}
              />
            </div>
          </FormRow>
          <FormRow label="Sensitivity">
            <select
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
              value={policyForm.dataSensitivity}
              onChange={(event) => setPolicyForm((prev) => ({ ...prev, dataSensitivity: event.target.value }))}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </FormRow>
          <button
            type="submit"
            className="mt-2 rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
            disabled={policyMutation.isPending}
          >
            Evaluate
          </button>
        </form>

        <form
          className="rounded-lg border border-border bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            killSwitchMutation.mutate({
              ...killSwitchForm,
              metadata: { source: "paperclip_ui" }
            });
          }}
        >
          <h3 className="font-semibold">Kill Switch</h3>
          <FormRow label="Run / Task">
            <div className="grid grid-cols-2 gap-2">
              <input
                className="rounded border border-border bg-background px-2 py-1 text-sm"
                value={killSwitchForm.runId}
                onChange={(event) => setKillSwitchForm((prev) => ({ ...prev, runId: event.target.value }))}
              />
              <input
                className="rounded border border-border bg-background px-2 py-1 text-sm"
                value={killSwitchForm.taskId}
                onChange={(event) => setKillSwitchForm((prev) => ({ ...prev, taskId: event.target.value }))}
              />
            </div>
          </FormRow>
          <FormRow label="Actor DPR">
            <input
              className="w-full rounded border border-border bg-background px-2 py-1 text-sm"
              value={killSwitchForm.actorDprId}
              onChange={(event) => setKillSwitchForm((prev) => ({ ...prev, actorDprId: event.target.value }))}
            />
          </FormRow>
          <FormRow label="Scope / Target">
            <div className="grid grid-cols-2 gap-2">
              <select
                className="rounded border border-border bg-background px-2 py-1 text-sm"
                value={killSwitchForm.scope}
                onChange={(event) => setKillSwitchForm((prev) => ({ ...prev, scope: event.target.value }))}
              >
                <option value="agent">agent</option>
                <option value="workflow">workflow</option>
                <option value="tenant">tenant</option>
                <option value="global">global</option>
              </select>
              <input
                className="rounded border border-border bg-background px-2 py-1 text-sm"
                value={killSwitchForm.targetKey}
                onChange={(event) => setKillSwitchForm((prev) => ({ ...prev, targetKey: event.target.value }))}
              />
            </div>
          </FormRow>
          <FormRow label="State / Reason">
            <div className="grid grid-cols-2 gap-2">
              <select
                className="rounded border border-border bg-background px-2 py-1 text-sm"
                value={killSwitchForm.state}
                onChange={(event) => setKillSwitchForm((prev) => ({ ...prev, state: event.target.value }))}
              >
                <option value="active">active</option>
                <option value="released">released</option>
              </select>
              <input
                className="rounded border border-border bg-background px-2 py-1 text-sm"
                value={killSwitchForm.reason}
                onChange={(event) => setKillSwitchForm((prev) => ({ ...prev, reason: event.target.value }))}
              />
            </div>
          </FormRow>
          <button
            type="submit"
            className="mt-2 rounded bg-primary px-3 py-1 text-sm text-primary-foreground"
            disabled={killSwitchMutation.isPending}
          >
            Apply
          </button>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="mb-2 font-semibold">Operation Output</h2>
        <pre className="max-h-80 overflow-auto rounded bg-muted/40 p-3 text-xs">
{operationOutput || "No operation yet."}
        </pre>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded border border-border bg-muted/30 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function FormRow(props: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <div className="mb-1 text-xs text-muted-foreground">{props.label}</div>
      {props.children}
    </label>
  );
}
