import { useQuery } from "@tanstack/react-query";
import { useCompany } from "@/context/CompanyContext";
import { activityApi } from "@/api/activity";
import { personaApi } from "@/api/persona";
import { queryKeys } from "@/lib/queryKeys";

function toStringValue(value: unknown, fallback = "-") {
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function LiNKbrainViewPage() {
  const { selectedCompanyId } = useCompany();

  const activityQuery = useQuery({
    queryKey: queryKeys.activity(selectedCompanyId ?? ""),
    queryFn: () => activityApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId)
  });

  const readinessQuery = useQuery({
    queryKey: ["persona", "readiness", selectedCompanyId],
    queryFn: () => personaApi.readiness(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId)
  });

  const entitiesQuery = useQuery({
    queryKey: ["persona", "entities", selectedCompanyId],
    queryFn: () => personaApi.entities(selectedCompanyId!, "persona"),
    enabled: Boolean(selectedCompanyId)
  });

  const revisionsQuery = useQuery({
    queryKey: ["persona", "revisions", selectedCompanyId],
    queryFn: () => personaApi.revisions(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId)
  });

  if (!selectedCompanyId) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <h1 className="text-xl font-semibold">LiNKbrain</h1>
        <p className="mt-2 text-sm text-muted-foreground">Select a company to view LiNKbrain data.</p>
      </div>
    );
  }

  const readiness = readinessQuery.data?.summary ?? {};
  const entities = entitiesQuery.data?.entities ?? [];
  const revisions = revisionsQuery.data?.revisions ?? [];
  const activity = activityQuery.data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-5 py-4">
      <div>
        <h1 className="text-2xl font-semibold">LiNKbrain</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Read-only memory and persona timeline view for the selected company.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Readiness</h2>
        <div className="mt-3 grid grid-cols-2 gap-3 text-sm md:grid-cols-5">
          <div className="rounded border border-border p-3">
            <div className="text-muted-foreground">Total Agents</div>
            <div className="mt-1 font-semibold">{String(readiness.totalAgents ?? "-")}</div>
          </div>
          <div className="rounded border border-border p-3">
            <div className="text-muted-foreground">Ready</div>
            <div className="mt-1 font-semibold">{String(readiness.readyAgents ?? "-")}</div>
          </div>
          <div className="rounded border border-border p-3">
            <div className="text-muted-foreground">Published Bundles</div>
            <div className="mt-1 font-semibold">{String(readiness.publishedBundles ?? "-")}</div>
          </div>
          <div className="rounded border border-border p-3">
            <div className="text-muted-foreground">Acknowledged</div>
            <div className="mt-1 font-semibold">{String(readiness.acknowledgedBundles ?? "-")}</div>
          </div>
          <div className="rounded border border-border p-3">
            <div className="text-muted-foreground">Policy Assigned</div>
            <div className="mt-1 font-semibold">{String(readiness.policyAssignedAgents ?? "-")}</div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Persona Entities</h2>
          <div className="mt-3 max-h-80 overflow-auto rounded border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-muted/40">
                <tr>
                  <th className="px-2 py-2">Title</th>
                  <th className="px-2 py-2">Scope</th>
                  <th className="px-2 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {entities.slice(0, 200).map((entity) => (
                  <tr key={toStringValue(entity.id)} className="border-t border-border">
                    <td className="px-2 py-2">{toStringValue(entity.title)}</td>
                    <td className="px-2 py-2">
                      {toStringValue(entity.scope_kind)}:{toStringValue(entity.scope_key)}
                    </td>
                    <td className="px-2 py-2">{toStringValue(entity.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold">Revision Timeline</h2>
          <div className="mt-3 max-h-80 overflow-auto rounded border border-border">
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
                {revisions.slice(0, 300).map((revision) => (
                  <tr key={toStringValue(revision.id)} className="border-t border-border">
                    <td className="px-2 py-2">{toStringValue(revision.entity_id)}</td>
                    <td className="px-2 py-2">{toStringValue(revision.revision_number)}</td>
                    <td className="px-2 py-2">{toStringValue(revision.status)}</td>
                    <td className="px-2 py-2">{toStringValue(revision.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card p-4">
        <h2 className="text-sm font-semibold">Activity Timeline</h2>
        <div className="mt-3 max-h-96 overflow-auto rounded border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/40">
              <tr>
                <th className="px-2 py-2">Time</th>
                <th className="px-2 py-2">Action</th>
                <th className="px-2 py-2">Entity</th>
                <th className="px-2 py-2">Actor</th>
              </tr>
            </thead>
            <tbody>
              {activity.slice(0, 300).map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="px-2 py-2">{new Date(row.createdAt).toISOString()}</td>
                  <td className="px-2 py-2">{row.action}</td>
                  <td className="px-2 py-2">{row.entityType}:{row.entityId}</td>
                  <td className="px-2 py-2">{row.actorType}:{row.actorId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
