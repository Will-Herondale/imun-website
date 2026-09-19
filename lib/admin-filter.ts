/**
 * Admin-side filtering/sorting/pagination over registration records.
 * Shared by the dashboard list endpoint and the CSV export endpoint.
 */
import type { RegistrationRecord } from "@/lib/validation/registration";

export type AdminQuery = {
  search?: string;
  committee?: string;
  status?: string;
  sort?: string;
  dir?: "asc" | "desc";
};

export function filterRegistrations(
  rows: RegistrationRecord[],
  query: AdminQuery
): RegistrationRecord[] {
  const q = (query.search ?? "").trim().toLowerCase();
  const committee = (query.committee ?? "").trim().toUpperCase();
  const status = (query.status ?? "").trim();

  let out = rows;
  if (q) {
    out = out.filter((r) =>
      [
        r.fullName,
        r.email,
        r.schoolName,
        r.countryPreference,
        r.grade,
        r.contactNumber,
        r.paymentReference,
        r.paymentUtr,
        r.paymentOrderId,
        r.paymentPayer,
      ].some((v) => v.toLowerCase().includes(q))
    );
  }
  if (committee) {
    out = out.filter(
      (r) =>
        r.committeePref1 === committee ||
        r.committeePref2 === committee ||
        r.committeePref3 === committee
    );
  }
  if (status) out = out.filter((r) => r.allocationStatus === status);

  const field = query.sort ?? "createdAt";
  const dir = query.dir === "asc" ? 1 : -1;
  out = [...out].sort((a, b) => {
    const av = a[field as keyof RegistrationRecord];
    const bv = b[field as keyof RegistrationRecord];
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
    return String(av).localeCompare(String(bv)) * dir;
  });

  return out;
}

export function paginate<T>(rows: T[], page: number, pageSize: number) {
  const safePage = Number.isFinite(page) && page > 0 ? page : 1;
  const size = Math.min(Math.max(Number.isFinite(pageSize) ? pageSize : 25, 1), 200);
  const total = rows.length;
  const pages = Math.max(1, Math.ceil(total / size));
  const start = (safePage - 1) * size;
  return {
    items: rows.slice(start, start + size),
    total,
    pages,
    page: safePage,
    pageSize: size,
  };
}

/** The full column set for CSV export. */
export const EXPORT_HEADERS = [
  "ID",
  "Created At",
  "Full Name",
  "Email",
  "Contact Number",
  "School Name",
  "Grade",
  "MUN Count",
  "MUN History",
  "Committee Preference 1",
  "Committee Preference 2",
  "Committee Preference 3",
  "Preferred Country",
  "Special Request",
  "Payment Reference",
  "Payment Status",
  "Payment Order ID",
  "Payment UTR",
  "Payment Payer",
  "Paid At",
  "Expected Fee (INR)",
  "Status",
  "Allocation Status",
  "Allocated Committee",
  "Allocated Portfolio",
  "Allocation Notes",
  "Allocation Updated At",
] as const;

export function recordToCsvRow(r: RegistrationRecord): Record<string, unknown>[] {
  return [
    {
      ID: r.id,
      "Created At": r.createdAt,
      "Full Name": r.fullName,
      Email: r.email,
      "Contact Number": r.contactNumber,
      "School Name": r.schoolName,
      Grade: r.grade,
      "MUN Count": r.munCount,
      "MUN History": r.munHistory,
      "Committee Preference 1": r.committeePref1,
      "Committee Preference 2": r.committeePref2,
      "Committee Preference 3": r.committeePref3,
      "Preferred Country": r.countryPreference,
      "Special Request": r.specialRequest,
      "Payment Reference": r.paymentReference,
      "Payment Status": r.paymentStatus,
      "Payment Order ID": r.paymentOrderId,
      "Payment UTR": r.paymentUtr,
      "Payment Payer": r.paymentPayer,
      "Paid At": r.paidAt,
      "Expected Fee (INR)": r.feeAmount,
      Status: r.status,
      "Allocation Status": r.allocationStatus,
      "Allocated Committee": r.allocatedCommittee,
      "Allocated Portfolio": r.allocatedPortfolio,
      "Allocation Notes": r.allocationNotes,
      "Allocation Updated At": r.updatedAt,
    },
  ];
}