import { describe, it, expect } from "vitest";
import { csvEscape, toCsv } from "@/lib/utils/csv";

describe("toCsv", () => {
  it("quotes every field per RFC 4180", () => {
    const csv = toCsv(["Name", "Note"], [["Aarav, Sharma", 'He said "hi"']]);
    expect(csv).toBe('"Name","Note"\r\n"Aarav, Sharma","He said ""hi"""');
  });

  it("handles null/undefined as empty", () => {
    const csv = toCsv(["a"], [[null]]);
    expect(csv).toBe('"a"\r\n""');
  });

  it("joins lines with CRLF", () => {
    const csv = toCsv(["x"], [["1"], ["2"]]);
    expect(csv).toBe('"x"\r\n"1"\r\n"2"');
  });
});

describe("csvEscape", () => {
  it("escapes embedded quotes by doubling", () => {
    expect(csvEscape('say "yes"')).toBe('"say ""yes"""');
  });
  it("renders newlines inside a field", () => {
    expect(csvEscape("a\nb")).toBe('"a\nb"');
  });
});