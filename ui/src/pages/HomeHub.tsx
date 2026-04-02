import { Bot, Brain, Home, Wrench } from "lucide-react";
import { Link, useParams } from "@/lib/router";
import { useCompany } from "@/context/CompanyContext";

type HomeCard = {
  title: string;
  description: string;
  to: string;
  icon: typeof Home;
};

export function HomeHub() {
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  const { selectedCompany } = useCompany();

  if (!companyPrefix) {
    return (
      <div className="mx-auto max-w-3xl py-10">
        <h1 className="text-xl font-semibold">LiNKaios Home</h1>
        <p className="mt-2 text-sm text-muted-foreground">Select a company to continue.</p>
      </div>
    );
  }

  const base = `/${companyPrefix}`;
  const cards: HomeCard[] = [
    {
      title: "Paperclip",
      description: "Core company workspace, tasks, onboarding, and operations.",
      to: `${base}/dashboard`,
      icon: Home
    },
    {
      title: "LiNKskills",
      description: "Manage per-agent skill assignment with company-wide defaults and overrides.",
      to: `${base}/linkskills`,
      icon: Wrench
    },
    {
      title: "LiNKbrain",
      description: "Read-only operational memory, persona revisions, and timeline visibility.",
      to: `${base}/linkbrain`,
      icon: Brain
    },
    {
      title: "Agent UI",
      description: "Open runtime UI per agent (OpenClaw now, future agent runtimes later).",
      to: `${base}/agent-ui`,
      icon: Bot
    }
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-5 py-4">
      <div>
        <h1 className="text-2xl font-semibold">LiNKaios Home</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Unified control surface for {selectedCompany?.name ?? "selected company"}.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map((card) => (
          <Link
            key={card.title}
            to={card.to}
            className="no-underline"
          >
            <div className="rounded-lg border border-border bg-card p-4 transition-colors hover:bg-accent/30">
              <div className="mb-3 inline-flex rounded-md bg-muted p-2">
                <card.icon className="h-4 w-4" />
              </div>
              <h2 className="font-semibold text-foreground">{card.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{card.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
