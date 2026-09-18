/** CSV rendering helpers. Escape strictly per RFC 4180. */

export function csvEscape(value: unknown): string {
  const s = value == null ? "" : String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: Array<Array<unknown>>): string {
  const lines = [headers.map((h) => csvEscape(h)).join(",")];
  for (const row of rows) lines.push(row.map((v) => csvEscape(v)).join(","));
  return lines.join("\r\n");
}

/** Recommended filename for the export endpoint. */
export function exportFileName(): string {
  const d = new Date();
  const stamp = d.toISOString().slice(0, 10);
  return `iemun-registrations-${stamp}.csv`;
}