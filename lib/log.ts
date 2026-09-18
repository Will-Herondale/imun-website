/**
 * Minimal structured logger.
 * We deliberately do NOT log registration payloads (personal data). Only
 * non-personal identifiers (record id, error classes) reach the log.
 */

type Level = "info" | "warn" | "error";

const enabled = (level: Level): boolean => {
  const configured = process.env.LOG_LEVEL?.toLowerCase();
  if (!configured) return true;
  const order: Record<Level, number> = { info: 1, warn: 2, error: 3 };
  return order[level] >= (order[configured as Level] ?? 1);
};

function write(level: Level, message: string, context?: Record<string, unknown>) {
  if (!enabled(level)) return;
  const line = `[iemun:${level}] ${message}${context ? " " + JSON.stringify(context) : ""}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const log = {
  info: (message: string, context?: Record<string, unknown>) => write("info", message, context),
  warn: (message: string, context?: Record<string, unknown>) => write("warn", message, context),
  error: (message: string, context?: Record<string, unknown>) => write("error", message, context),
};