/**
 * Allocation aggregation.
 *
 * Pure functions over registration records, shared by the admin matrix endpoint
 * and the public /allocations page. No I/O here so both can be unit-tested.
 */
import { committees } from "@/lib/config/committees";
import type { AllocationStatus, RegistrationRecord } from "@/lib/validation/registration";

export const allocationStatusLabels: Record<AllocationStatus, string> = {
  pending: "Pending",
  allocated: "Allocated",
  waitlisted: "Waitlisted",
  rejected: "Not selected",
};

export type CommitteeMatrixRow = {
  code: string;
  name: string;
  seats: number;
  allocated: number;
  remaining: number;
  waitlisted: number;
  pref1: number;
  pref2: number;
  pref3: number;
  demand: number;
};

export type AllocationSummary = {
  totals: {
    total: number;
    allocated: number;
    pending: number;
    waitlisted: number;
    rejected: number;
    seats: number;
    seatsFilled: number;
    seatsRemaining: number;
    fillRate: number;
  };
  committees: CommitteeMatrixRow[];
  schools: Array<{ school: string; total: number; allocated: number }>;
};

function countStatus(rows: RegistrationRecord[], status: AllocationStatus): number {
  return rows.filter((r) => r.allocationStatus === status).length;
}

/** Rolls a flat record list into the numbers the matrix tab and exports need. */
export function buildAllocationSummary(rows: RegistrationRecord[]): AllocationSummary {
  const committeeRows: CommitteeMatrixRow[] = committees.map((c) => {
    const pref1 = rows.filter((r) => r.committeePref1 === c.code).length;
    const pref2 = rows.filter((r) => r.committeePref2 === c.code).length;
    const pref3 = rows.filter((r) => r.committeePref3 === c.code).length;
    const allocated = rows.filter(
      (r) => r.allocationStatus === "allocated" && r.allocatedCommittee === c.code
    ).length;
    const waitlisted = rows.filter(
      (r) => r.allocationStatus === "waitlisted" && r.allocatedCommittee === c.code
    ).length;
    return {
      code: c.code,
      name: c.name,
      seats: c.seats,
      allocated,
      remaining: Math.max(0, c.seats - allocated),
      waitlisted,
      pref1,
      pref2,
      pref3,
      demand: pref1 + pref2 + pref3,
    };
  });

  const seats = committees.reduce((sum, c) => sum + c.seats, 0);
  const allocated = countStatus(rows, "allocated");

  const bySchool = new Map<string, { total: number; allocated: number }>();
  for (const r of rows) {
    const key = r.schoolName.trim() || "—";
    const entry = bySchool.get(key) ?? { total: 0, allocated: 0 };
    entry.total += 1;
    if (r.allocationStatus === "allocated") entry.allocated += 1;
    bySchool.set(key, entry);
  }
  const schools = [...bySchool.entries()]
    .map(([school, v]) => ({ school, ...v }))
    .sort((a, b) => b.total - a.total || a.school.localeCompare(b.school));

  return {
    totals: {
      total: rows.length,
      allocated,
      pending: countStatus(rows, "pending"),
      waitlisted: countStatus(rows, "waitlisted"),
      rejected: countStatus(rows, "rejected"),
      seats,
      seatsFilled: allocated,
      seatsRemaining: Math.max(0, seats - allocated),
      fillRate: seats > 0 ? Math.round((allocated / seats) * 100) : 0,
    },
    committees: committeeRows,
    schools,
  };
}

export type PublicAllocationGroup = {
  code: string;
  name: string;
  seats: number;
  delegates: Array<{ name: string; school: string; portfolio: string }>;
};

/**
 * Public-safe projection: only allocated delegates, and only the fields the
 * secretariat agreed to publish (name, school, portfolio). Contact details,
 * notes and preferences are never included.
 */
export function publicAllocationGroups(rows: RegistrationRecord[]): PublicAllocationGroup[] {
  return committees
    .map((c) => {
      const delegates = rows
        .filter((r) => r.allocationStatus === "allocated" && r.allocatedCommittee === c.code)
        .map((r) => ({
          name: r.fullName,
          school: r.schoolName,
          portfolio: r.allocatedPortfolio,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
      return { code: c.code, name: c.name, seats: c.seats, delegates };
    })
    .filter((g) => g.delegates.length > 0);
}
