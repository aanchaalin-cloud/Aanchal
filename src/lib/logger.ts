export type LogLevel = "info" | "warn" | "error" | "debug";

function buildEntry(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  const entry: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  if (meta && Object.keys(meta).length) {
    entry.meta = meta;
  }
  return entry;
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  try {
    const entry = buildEntry(level, message, meta);
    console.log(JSON.stringify(entry));
  } catch {
    console.log(`${level.toUpperCase()}: ${message}`, meta ?? "");
  }
}

export const info = (message: string, meta?: Record<string, unknown>) => log("info", message, meta);
export const warn = (message: string, meta?: Record<string, unknown>) => log("warn", message, meta);
export const error = (message: string, meta?: Record<string, unknown>) => log("error", message, meta);
export const debug = (message: string, meta?: Record<string, unknown>) => log("debug", message, meta);
