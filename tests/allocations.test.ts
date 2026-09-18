import { describe, it, expect } from "vitest";
import { buildAllocationSummary, publicAllocationGroups } from "@/lib/allocations";
import {
  allocationUpdateSchema,
  emptyAllocation,
  type RegistrationRecord,
} from "@/lib/validation/registration";

function rec(overrides: Partial<RegistrationRecord> = {}): RegistrationRecord {
  return {
    ...emptyAllocation(),
    id: "1",
    createdAt: "2026-09-01T09:00:00.000Z",
    status: "submitted",
    fullName: "Aarav Sharma",
    email: "aarav@example.com",
    contactNumber: "9876543210",
    schoolName: "St Xavier's",
    grade: "11",
    munCount: "1",
    munHistory: "",
    committeePref1: "DISEC",
    committeePref2: "UNHRC",
    committeePref3: "EU",
    countryPreference: "India",
    specialRequest: "",
    declarationAccurate: "Yes",
    declarationRules: "Yes",
    ...overrides,
  };
}

describe("buildAllocationSummary", () => {
  const rows = [
    rec({
      id: "1",
      allocationStatus: "allocated",
      allocatedCommittee: "UNHRC",
      allocatedPortfolio: "United States",
      schoolName: "School A",
    }),
    rec({
      id: "2",
      allocationStatus: "allocated",
      allocatedCommittee: "UNHRC",
      allocatedPortfolio: "France",
      schoolName: "School A",
    }),
    rec({ id: "3", allocationStatus: "waitlisted", schoolName: "School B" }),
    rec({ id: "4", schoolName: "School B" }),
  ];

  it("counts totals by allocation status", () => {
    const s = buildAllocationSummary(rows);
    expect(s.totals.total).toBe(4);
    expect(s.totals.allocated).toBe(2);
    expect(s.totals.waitlisted).toBe(1);
    expect(s.totals.pending).toBe(1);
    expect(s.totals.rejected).toBe(0);
  });

  it("rolls allocations and preference demand into committee rows", () => {
    const s = buildAllocationSummary(rows);
    const UNHRC = s.committees.find((c) => c.code === "UNHRC")!;
    expect(UNHRC.allocated).toBe(2);
    expect(UNHRC.remaining).toBe(UNHRC.seats - 2);

    const DISEC = s.committees.find((c) => c.code === "DISEC")!;
    expect(DISEC.pref1).toBe(4);
    expect(DISEC.allocated).toBe(0);
  });

  it("groups registrations and allocations by school", () => {
    const s = buildAllocationSummary(rows);
    expect(s.schools[0]).toEqual({ school: "School A", total: 2, allocated: 2 });
    expect(s.schools[1]).toEqual({ school: "School B", total: 2, allocated: 0 });
  });
});

describe("publicAllocationGroups", () => {
  it("exposes only allocated delegates and only public fields", () => {
    const rows = [
      rec({
        id: "1",
        fullName: "Zoya Khan",
        schoolName: "School A",
        allocationStatus: "allocated",
        allocatedCommittee: "UNHRC",
        allocatedPortfolio: "France",
      }),
      rec({ id: "2", fullName: "Meera Iyer", schoolName: "School B" }),
    ];
    const groups = publicAllocationGroups(rows);
    expect(groups).toHaveLength(1);
    expect(groups[0].code).toBe("UNHRC");
    expect(groups[0].delegates).toEqual([
      { name: "Zoya Khan", school: "School A", portfolio: "France" },
    ]);
    expect(JSON.stringify(groups)).not.toContain("aarav@example.com");
  });
});

describe("allocationUpdateSchema", () => {
  it("accepts a valid allocation", () => {
    const parsed = allocationUpdateSchema.safeParse({
      allocationStatus: "allocated",
      allocatedCommittee: "DISEC",
      allocatedPortfolio: "India",
      allocationNotes: "",
    });
    expect(parsed.success).toBe(true);
  });

  it("requires a committee when marking a delegate allocated", () => {
    const parsed = allocationUpdateSchema.safeParse({
      allocationStatus: "allocated",
      allocatedCommittee: "",
      allocatedPortfolio: "",
      allocationNotes: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects unknown committees", () => {
    const parsed = allocationUpdateSchema.safeParse({
      allocationStatus: "waitlisted",
      allocatedCommittee: "NOTREAL",
      allocatedPortfolio: "",
      allocationNotes: "",
    });
    expect(parsed.success).toBe(false);
  });
});
