import { useMemo } from "react";
import { ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { Agent } from "@paperclipai/shared";
import { useCompany } from "@/context/CompanyContext";
import { agentsApi } from "@/api/agents";
import { queryKeys } from "@/lib/queryKeys";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toDashboardUrl(wsUrl: string) {
  try {
    const next = new URL(wsUrl);
    const protocol = next.protocol === "wss:" ? "https:" : "http:";
    return `${protocol}//${next.host}/chat?session=main`;
  } catch {
    return null;
  }
}

function resolveOpenClawUi(agent: Agent): { dashboardUrl: string | null; token: string | null; warning: string | null } {
  const config = asRecord(agent.adapterConfig);
  if (!config) {
    return { dashboardUrl: null, token: null, warning: "Missing adapter config" };
  }
  const wsUrl = stringValue(config.url);
  const headers = asRecord(config.headers);
  const token = stringValue(headers?.["x-openclaw-token"]) ?? stringValue(headers?.["x-openclaw-auth"]);
  const dashboardUrl = wsUrl ? toDashboardUrl(wsUrl) : null;
  if (!dashboardUrl) {
    return { dashboardUrl: null, token, warning: "Gateway URL not configured" };
  }
  if (!token) {
    return { dashboardUrl, token: null, warning: "Gateway token not configured in adapter headers" };
  }
  if (token.startsWith("secret://")) {
    return { dashboardUrl, token: null, warning: "Gateway token stored as secret reference; open manually with runtime token" };
  }
  return { dashboardUrl, token, warning: null };
}

export function AgentUiHubPage() {
  const { selectedCompanyId } = useCompany();
  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId ?? ""),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId)
  });

  const runtimeAgents = useMemo(
    () => (agentsQuery.data ?? []).filter((agent) => agent.status !== "terminated"),
    [agentsQuery.data]
  );

  if (!selectedCompanyId) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <h1 className="text-xl font-semibold">Agent UI</h1>
        <p className="mt-2 text-sm text-muted-foreground">Select a company to view agent runtimes.</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-5 py-4">
      <div>
        <h1 className="text-2xl font-semibold">Agent UI</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Runtime entrypoints by agent. OpenClaw agents open directly to their own dashboard.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {runtimeAgents.map((agent) => {
          const isOpenClaw = agent.adapterType === "openclaw_gateway";
          const openClawUi = isOpenClaw ? resolveOpenClawUi(agent) : null;
          const launchHref = isOpenClaw && openClawUi?.dashboardUrl && openClawUi.token
            ? `${openClawUi.dashboardUrl}#token=${encodeURIComponent(openClawUi.token)}`
            : null;
          return (
            <div key={agent.id} className="rounded-lg border border-border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold">{agent.name}</h2>
                  <div className="text-xs text-muted-foreground">{agent.title ?? agent.role}</div>
                </div>
                <span className="rounded bg-muted px-2 py-0.5 text-xs">{agent.status}</span>
              </div>
              <div className="mt-3 text-xs text-muted-foreground">
                Adapter: {agent.adapterType}
              </div>
              {isOpenClaw ? (
                <div className="mt-3 space-y-2">
                  {launchHref ? (
                    <a
                      href={launchHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded border border-border px-3 py-1.5 text-sm hover:bg-accent/40"
                    >
                      Open OpenClaw UI <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : (
                    <div className="text-xs text-amber-700 dark:text-amber-300">
                      {openClawUi?.warning ?? "OpenClaw UI launch is not configured for this agent yet."}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-3 text-xs text-muted-foreground">
                  UI launcher for this adapter type is not wired yet.
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
