"use server";

import { promises as fs } from "node:fs";
import path from "node:path";
import { requireRole } from "@/lib/auth/session";
import { appLog } from "@/lib/logging/app-logger";

export type ServerLogFileSummary = {
  name: string;
  sizeBytes: number;
  modifiedAt: string | null;
};

export type ServerLogTail = {
  fileName: string;
  lines: string[];
  truncated: boolean;
  note: string | null;
};

const LOG_DIR = path.join(process.cwd(), "logs");
const MAX_TAIL_BYTES = 256 * 1024;
const MAX_LINES = 400;

function isSafeLogFileName(name: string): boolean {
  return /^[\w.-]+\.log$/i.test(name) && !name.includes("..") && !name.includes("/") && !name.includes("\\");
}

export async function listServerLogFiles(): Promise<ServerLogFileSummary[]> {
  await requireRole("NIGRA");

  try {
    const entries = await fs.readdir(LOG_DIR, { withFileTypes: true });
    const files: ServerLogFileSummary[] = [];

    for (const entry of entries) {
      if (!entry.isFile() || !isSafeLogFileName(entry.name)) continue;
      const full = path.join(LOG_DIR, entry.name);
      const stat = await fs.stat(full);
      files.push({
        name: entry.name,
        sizeBytes: stat.size,
        modifiedAt: stat.mtime.toISOString(),
      });
    }

    return files.sort((a, b) =>
      (b.modifiedAt ?? "").localeCompare(a.modifiedAt ?? "")
    );
  } catch (error) {
    appLog.warn("Could not list server log files", {
      error: error instanceof Error ? error.message : String(error),
    });
    return [];
  }
}

export async function tailServerLogFile(
  fileName: string
): Promise<ServerLogTail> {
  await requireRole("NIGRA");

  if (!isSafeLogFileName(fileName)) {
    return {
      fileName,
      lines: [],
      truncated: false,
      note: "Invalid log file name.",
    };
  }

  const full = path.join(LOG_DIR, fileName);

  try {
    const stat = await fs.stat(full);
    const start = Math.max(0, stat.size - MAX_TAIL_BYTES);
    const handle = await fs.open(full, "r");
    try {
      const length = stat.size - start;
      const buffer = Buffer.alloc(length);
      await handle.read(buffer, 0, length, start);
      const text = buffer.toString("utf8");
      const allLines = text.split(/\r?\n/).filter((line) => line.length > 0);
      const lines = allLines.slice(-MAX_LINES);
      return {
        fileName,
        lines,
        truncated: start > 0 || allLines.length > MAX_LINES,
        note:
          "SmarterASP has no CloudWatch. These lines come from IIS stdout (logs/). The file may be locked while the app is writing — refresh if empty.",
      };
    } finally {
      await handle.close();
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    appLog.warn("Could not read server log file", { fileName, error: message });
    return {
      fileName,
      lines: [],
      truncated: false,
      note:
        message.includes("ENOENT")
          ? "Log file not found yet. Hit the site once, then refresh. Ensure the logs/ folder exists next to server.js."
          : `Could not read log file (${message}). On IIS the stdout file is sometimes locked — try again in a moment, or download via FTP.`,
    };
  }
}
