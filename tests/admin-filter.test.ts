import { describe, it, expect } from "vitest";
import { filterRegistrations, paginate } from "@/lib/admin-filter";
import { emptyAllocation, type RegistrationRecord } from "@/lib/validation/registration";

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
    committeePref1: "UNGA",
    committeePref2: "UNHRC",
    committeePref3: "WHO",
    countryPreference: "India",
    specialRequest: "",
    declarationAccurate: "Yes",
    declarationRules: "Yes",
    ...overrides,
  };
}

const rows = [
  rec({ id: "1", fullName: "Aarav Sharma", email: "aarav@example.com", countryPreference: "India" }),
  rec({
    id: "2",
    fullName: "Zoya Khan",
    email: "zoya@school.in",
    committeePref1: "UNSC",
    committeePref2: "UNGA",
    committeePref3: "UNEP",
    countryPreference: "",
  }),
  rec({
    id: "3",
    fullName: "Meera Iyer",
    email: "meera@example.com",
    committeePref1: "UNGA",
    committeePref2: "WHO",
    committeePref3: "LS",
  }),
];

describe("filterRegistrations", () => {
  it("filters by search term across fields", () => {
    const out = filterRegistrations(rows, { search: "zoya" });
    expect(out.map((r) => r.id)).toEqual(["2"]);
    expect(filterRegistrations(rows, { search: "india" }).map((r) => r.id)).toEqual(["1", "3"]);
  });

  it("filters by committee preference", () => {
    const out = filterRegistrations(rows, { committee: "UNSC" });
    expect(out.map((r) => r.id)).toEqual(["2"]);
  });

  it("sorts desc by default and asc when requested", () => {
    const desc = filterRegistrations(rows, { sort: "fullName" });
    expect(desc.map((r) => r.fullName)).toEqual(["Zoya Khan", "Meera Iyer", "Aarav Sharma"]);
    const asc = filterRegistrations(rows, { sort: "fullName", dir: "asc" });
    expect(asc.map((r) => r.fullName)).toEqual(["Aarav Sharma", "Meera Iyer", "Zoya Khan"]);
  });

  it("does not mutate the input list", () => {
    const before = rows.map((r) => r.id);
    filterRegistrations(rows, { sort: "fullName", search: "a" });
    expect(rows.map((r) => r.id)).toEqual(before);
  });
});

describe("paginate", () => {
  it("slices within bounds", () => {
    const p = paginate(rows, 2, 1);
    expect(p.items.map((r) => r.id)).toEqual(["2"]);
    expect(p.total).toBe(3);
    expect(p.pages).toBe(3);
  });

  it("guards against invalid input", () => {
    expect(paginate(rows, 0, 0).items).toHaveLength(1);
    expect(paginate(rows, 999, 25).items).toHaveLength(0);
    expect(paginate([], 1, 25).pages).toBe(1);
  });
});