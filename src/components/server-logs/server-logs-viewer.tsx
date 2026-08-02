"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  listServerLogFiles,
  tailServerLogFile,
  type ServerLogFileSummary,
  type ServerLogTail,
} from "@/actions/server-logs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ServerLogsViewer() {
  const [files, setFiles] = useState<ServerLogFileSummary[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [tail, setTail] = useState<ServerLogTail | null>(null);
  const [pending, startTransition] = useTransition();

  const refreshFiles = useCallback(() => {
    startTransition(async () => {
      try {
        const next = await listServerLogFiles();
        setFiles(next);
        setSelected((current) => {
          if (current && next.some((f) => f.name === current)) return current;
          return next[0]?.name ?? "";
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to list logs");
      }
    });
  }, []);

  const refreshTail = useCallback((fileName: string) => {
    if (!fileName) {
      setTail(null);
      return;
    }
    startTransition(async () => {
      try {
        const next = await tailServerLogFile(fileName);
        setTail(next);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to read log");
      }
    });
  }, []);

  useEffect(() => {
    refreshFiles();
  }, [refreshFiles]);

  useEffect(() => {
    if (selected) refreshTail(selected);
  }, [selected, refreshTail]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0">
          <div>
            <CardTitle>Host stdout logs</CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              SmarterASP does not provide CloudWatch. Logs are written to{" "}
              <code className="text-xs">logs/</code> via IIS{" "}
              <code className="text-xs">stdoutLogFile</code>. You can also
              download them over FTP.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => {
              refreshFiles();
              if (selected) refreshTail(selected);
            }}
          >
            {pending ? "Refreshing…" : "Refresh"}
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {files.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No <code className="text-xs">*.log</code> files under{" "}
              <code className="text-xs">logs/</code> yet. After deploy, restart
              Node, browse the site, then refresh.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {files.map((file) => (
                <Button
                  key={file.name}
                  type="button"
                  size="sm"
                  variant={selected === file.name ? "default" : "outline"}
                  onClick={() => setSelected(file.name)}
                >
                  {file.name}
                  <span className="ml-2 text-xs opacity-70">
                    {Math.max(1, Math.round(file.sizeBytes / 1024))} KB
                  </span>
                </Button>
              ))}
            </div>
          )}

          {tail?.note && (
            <p className="rounded-md border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
              {tail.note}
            </p>
          )}

          <pre className="max-h-[28rem] overflow-auto rounded-md border bg-zinc-950 p-3 text-xs leading-relaxed text-zinc-100">
            {tail?.lines?.length
              ? tail.lines.join("\n")
              : pending
                ? "Loading…"
                : "No log lines to show."}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
