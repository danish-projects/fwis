import { requireRole } from "@/lib/auth/session";
import { ServerLogsViewer } from "@/components/server-logs/server-logs-viewer";

export const metadata = { title: "Server Logs" };

export default async function ServerLogsPage() {
  await requireRole("NIGRA");

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Server Logs</h1>
        <p className="text-muted-foreground">
          Lightweight host log viewer (SmarterASP file logs — not AWS CloudWatch).
        </p>
      </div>
      <ServerLogsViewer />
    </div>
  );
}
