import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useCompany } from "@/context/CompanyContext";
import { agentsApi } from "@/api/agents";
import { companySkillsApi } from "@/api/companySkills";
import { queryKeys } from "@/lib/queryKeys";
import type { Agent, CompanySkillListItem } from "@paperclipai/shared";

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b));
}

export function LiNKskillsControlPage() {
  const queryClient = useQueryClient();
  const { selectedCompanyId } = useCompany();
  const [selectedAgentId, setSelectedAgentId] = useState<string>("");
  const [draft, setDraft] = useState<string[]>([]);

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId ?? ""),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId)
  });

  const skillsQuery = useQuery({
    queryKey: queryKeys.companySkills.list(selectedCompanyId ?? ""),
    queryFn: () => companySkillsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId)
  });

  const resolvedAgentId = useMemo(() => {
    if (!selectedAgentId) {
      return agentsQuery.data?.[0]?.id ?? "";
    }
    return selectedAgentId;
  }, [agentsQuery.data, selectedAgentId]);

  const snapshotQuery = useQuery({
    queryKey: queryKeys.agents.skills(resolvedAgentId || "__none__"),
    queryFn: () => agentsApi.skills(resolvedAgentId, selectedCompanyId ?? undefined),
    enabled: Boolean(resolvedAgentId && selectedCompanyId)
  });

  const allSkillKeys = useMemo(
    () => uniqueSorted((skillsQuery.data ?? []).map((skill) => skill.key)),
    [skillsQuery.data]
  );

  const requiredSkillKeys = useMemo(
    () =>
      uniqueSorted(
        (snapshotQuery.data?.entries ?? [])
          .filter((entry) => entry.required)
          .map((entry) => entry.key)
      ),
    [snapshotQuery.data?.entries]
  );

  const desiredSkills = snapshotQuery.data?.desiredSkills ?? [];

  useEffect(() => {
    setDraft(uniqueSorted(desiredSkills));
  }, [resolvedAgentId, snapshotQuery.data?.desiredSkills]);

  const syncMutation = useMutation({
    mutationFn: (desired: string[]) =>
      agentsApi.syncSkills(resolvedAgentId, desired, selectedCompanyId ?? undefined),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.skills(resolvedAgentId) });
      await queryClient.invalidateQueries({ queryKey: queryKeys.agents.detail(resolvedAgentId) });
    }
  });

  const isLoading = agentsQuery.isLoading || skillsQuery.isLoading || snapshotQuery.isLoading;

  if (!selectedCompanyId) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <h1 className="text-xl font-semibold">LiNKskills</h1>
        <p className="mt-2 text-sm text-muted-foreground">Select a company to manage skills.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-4">
      <div>
        <h1 className="text-2xl font-semibold">LiNKskills</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Per-agent skill assignment. New agents default to all company skills; agent-level settings override.
        </p>
      </div>

      <section className="rounded-lg border border-border bg-card p-4 space-y-4">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="text-muted-foreground">Agent</span>
            <select
              className="w-full rounded border border-border bg-background px-2 py-2"
              value={resolvedAgentId}
              onChange={(event) => setSelectedAgentId(event.target.value)}
            >
              {(agentsQuery.data ?? []).map((agent: Agent) => (
                <option key={agent.id} value={agent.id}>
                  {agent.name}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm">
            <div className="text-muted-foreground">Mode</div>
            <div className="mt-2">
              {snapshotQuery.data?.mode ?? "unknown"}{snapshotQuery.data?.supported ? "" : " (adapter-managed)"}
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading skills...
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="rounded border border-border px-3 py-1.5 text-sm hover:bg-accent/40"
                onClick={() => setDraft(uniqueSorted([...allSkillKeys, ...requiredSkillKeys]))}
              >
                Enable all
              </button>
              <button
                type="button"
                className="rounded border border-border px-3 py-1.5 text-sm hover:bg-accent/40"
                onClick={() => setDraft(uniqueSorted(requiredSkillKeys))}
              >
                Required only
              </button>
              <button
                type="button"
                className="rounded border border-border px-3 py-1.5 text-sm hover:bg-accent/40"
                onClick={() => setDraft(uniqueSorted(desiredSkills))}
              >
                Revert draft
              </button>
              <button
                type="button"
                className="rounded bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-60"
                disabled={syncMutation.isPending || !resolvedAgentId}
                onClick={() => syncMutation.mutate(uniqueSorted(draft))}
              >
                {syncMutation.isPending ? "Saving..." : "Save agent skills"}
              </button>
            </div>

            <div className="rounded border border-border">
              {(skillsQuery.data ?? []).map((skill: CompanySkillListItem) => {
                const required = requiredSkillKeys.includes(skill.key);
                const enabled = draft.includes(skill.key) || required;
                return (
                  <label key={skill.id} className="flex items-start gap-3 border-b border-border px-3 py-2 last:border-b-0">
                    <input
                      type="checkbox"
                      checked={enabled}
                      disabled={required}
                      onChange={(event) => {
                        if (required) return;
                        if (event.target.checked) {
                          setDraft((prev) => uniqueSorted([...prev, skill.key]));
                        } else {
                          setDraft((prev) => prev.filter((key) => key !== skill.key));
                        }
                      }}
                      className="mt-1"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {skill.name}
                        {required ? <span className="ml-2 text-xs text-muted-foreground">(required)</span> : null}
                      </div>
                      {skill.description ? (
                        <div className="text-xs text-muted-foreground">{skill.description}</div>
                      ) : null}
                      <div className="text-[11px] text-muted-foreground">{skill.key}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            {syncMutation.isError ? (
              <div className="text-sm text-destructive">
                {syncMutation.error instanceof Error ? syncMutation.error.message : "Failed to save skills"}
              </div>
            ) : null}
          </>
        )}
      </section>
    </div>
  );
}
