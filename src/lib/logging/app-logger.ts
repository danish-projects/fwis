import {
  schoolNowForDbTimestamp,
  SCHOOL_TIMEZONE,
} from "@/lib/calendar/calendar-date";

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogFields = Record<string, unknown>;

function stamp(): string {
  return schoolNowForDbTimestamp().toISOString().replace(/\.\d{3}Z$/, " CT");
}

function write(level: LogLevel, message: string, fields?: LogFields) {
  const entry = {
    ts: stamp(),
    tz: SCHOOL_TIMEZONE,
    level,
    message,
    ...(fields && Object.keys(fields).length > 0 ? { fields } : {}),
  };
  const line = JSON.stringify(entry);

  // httpPlatform stdout → logs/node-stdout.log on SmarterASP (no CloudWatch).
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

/** Structured logs for SmarterASP file monitoring (FTP / in-app viewer). */
export const appLog = {
  debug: (message: string, fields?: LogFields) => write("debug", message, fields),
  info: (message: string, fields?: LogFields) => write("info", message, fields),
  warn: (message: string, fields?: LogFields) => write("warn", message, fields),
  error: (message: string, fields?: LogFields) => write("error", message, fields),
};
