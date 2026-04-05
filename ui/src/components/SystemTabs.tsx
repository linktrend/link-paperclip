import { Link, useLocation, useParams } from "@/lib/router";
import { cn } from "@/lib/utils";

type TabItem = {
  key: "home" | "paperclip" | "linkskills" | "linkbrain" | "agent-ui";
  label: string;
  to: string;
  external?: boolean;
  isActive: (pathname: string) => boolean;
};

function isPaperclipPath(pathname: string) {
  return !(
    pathname.endsWith("/home") ||
    pathname.includes("/linkskills") ||
    pathname.includes("/linkbrain") ||
    pathname.includes("/agent-ui")
  );
}

export function SystemTabs() {
  const location = useLocation();
  const { companyPrefix } = useParams<{ companyPrefix: string }>();
  if (!companyPrefix) return null;

  const base = `/${companyPrefix}`;
  const tabs: TabItem[] = [
    {
      key: "home",
      label: "LiNKaios Home",
      to: `${base}/home`,
      isActive: (pathname) => pathname.endsWith("/home")
    },
    {
      key: "paperclip",
      label: "Operations",
      to: `${base}/dashboard`,
      isActive: (pathname) => isPaperclipPath(pathname)
    },
    {
      key: "linkskills",
      label: "LiNKskills",
      to: `${base}/linkskills`,
      isActive: (pathname) => pathname.includes("/linkskills")
    },
    {
      key: "linkbrain",
      label: "LiNKbrain",
      to: `${base}/linkbrain`,
      isActive: (pathname) => pathname.includes("/linkbrain")
    },
    {
      key: "agent-ui",
      label: "Agent UI",
      to: `${base}/agent-ui`,
      isActive: (pathname) => pathname.includes("/agent-ui")
    }
  ];

  return (
    <div className="border-b border-border bg-background px-4 md:px-6">
      <nav className="flex items-center gap-1 overflow-x-auto py-2">
        {tabs.map((tab) => {
          const active = tab.isActive(location.pathname);
          const className = cn(
            "rounded-md border px-3 py-1.5 text-sm font-medium no-underline transition-colors",
            active
              ? "border-orange-500 bg-orange-500/10 text-orange-600 dark:text-orange-400"
              : "border-transparent text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          );

          if (tab.key === "home") {
            return (
              <a
                key={tab.key}
                href={tab.to}
                className={className}
              >
                {tab.label}
              </a>
            );
          }

          return (
            <Link
              key={tab.key}
              to={tab.to}
              className={className}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
