/**
 * Shared validation for delegate registrations.
 *
 * This single schema drives BOTH the client-side form and the server-side API.
 * The server NEVER trusts the browser: the API sanitises every string field
 * (control-character stripping, whitespace collapse), normalises the email
 * address, then runs the same schema both paths rely on.
 */
import { z } from "zod";
import { committees } from "@/lib/config/committees";

export const munCountOptions = ["0", "1", "2", "3", "4+"] as const;
export type MunCount = (typeof munCountOptions)[number];

const committeeCodeOptions = committees.map((c) => c.code) as [
  string,
  ...string[],
];

/** Max size of a raw submission body in bytes (junk protection). */
export const MAX_BODY_BYTES = 64 * 1024;

/** Strips control characters and collapses internal whitespace (single line). */
export function sanitizeText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/** Multi-line variant that preserves meaningful line breaks. */
export function sanitizeMultiline(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.replace(/[ \t]+$/, "").trim())
    .filter((line, i, arr) => !(line === "" && arr[i - 1] === ""))
    .join("\n")
    .trim();
}

export function normalizeEmail(value: unknown): string {
  return sanitizeText(value).toLowerCase();
}

export function isIndianMobile(raw: string): boolean {
  const digits = raw.replace(/[\s\-()]/g, "");
  return /^(?:\+?91|0)?[6-9]\d{9}$/.test(digits) && digits.length <= 15;
}

const stringField = (min: number, max: number, message?: string, regex?: RegExp) =>
  z
    .string({ error: message ?? "This field is required." })
    .trim()
    .min(min, { message: message ?? "This field is required." })
    .max(max)
    .refine((s) => !regex || regex.test(s), { message: message ?? "This value is not in the expected format." });

export const registrationSchema = z
  .object({
    fullName: stringField(
      3,
      120,
      "Enter your full name (letters, spaces, dots, apostrophes).",
      /^[A-Za-z][A-Za-z .'’-]*$/
    ),

    email: z
      .string({ error: "Enter a valid email address." })
      .trim()
      .toLowerCase()
      .min(5)
      .max(254)
      .refine((s) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s), "Enter a valid email address."),

    contactNumber: stringField(
      10,
      20,
      "Enter a valid 10-digit Indian mobile number.",
      /^[+0-9][0-9\s\-()]*$/
    ).refine(isIndianMobile, "Enter a valid 10-digit Indian mobile number."),

    schoolName: stringField(2, 150, "School name is required."),
    grade: stringField(1, 30, "Grade or class is required."),

    munCount: z.enum(munCountOptions),

    /** Format:  MUN Name | Year | Committee | Portfolio | Award  — one per line */
    munHistory: z.string().trim().min(0).max(2400),

    committeePref1: stringField(0, 12),
    committeePref2: stringField(0, 12),
    committeePref3: stringField(0, 12),
    countryPreference: z.string().trim().min(0).max(80),
    specialRequest: z.string().trim().min(0).max(1200),

    declarationAccurate: z.literal("Yes", { error: "You must confirm that the information is accurate." }),
    declarationRules: z.literal("Yes", { error: "You must agree to follow the rules and regulations of IMUN." }),

    /** Honeypot — real users never see or fill this field. */
    website: z.string().max(200),
  })
  .superRefine((data, ctx) => {
    const prefs = [data.committeePref1, data.committeePref2, data.committeePref3];
    const unknownPrefs = prefs.filter((p) => !p);
    if (unknownPrefs.length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["committeePrefs"],
        message: "All three committee preferences are required.",
      });
    } else {
      if (!committeeCodeOptions.includes(data.committeePref1)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["committeePref1"], message: "Select a valid committee." });
      }
      if (!committeeCodeOptions.includes(data.committeePref2)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["committeePref2"], message: "Select a valid committee." });
      }
      if (!committeeCodeOptions.includes(data.committeePref3)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["committeePref3"], message: "Select a valid committee." });
      }
      if (new Set(prefs.filter(Boolean)).size !== 3) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["committeePrefs"],
          message: "Each committee preference must be different.",
        });
      }
    }
    if (data.munCount === "0" && data.munHistory.trim().length > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["munHistory"],
        message: "You indicated no prior conferences; remove the experience list.",
      });
    }
  })
  .strict();

/** The persisted record stored in Azure Table Storage. */
export type RegistrationInput = {
  fullName: string;
  email: string;
  contactNumber: string;
  schoolName: string;
  grade: string;
  munCount: MunCount;
  munHistory: string;
  committeePref1: string;
  committeePref2: string;
  committeePref3: string;
  countryPreference: string;
  specialRequest: string;
  declarationAccurate: "Yes";
  declarationRules: "Yes";
};

/** Secretariat workflow state for a registration once it is received. */
export const allocationStatusOptions = ["pending", "allocated", "waitlisted", "rejected"] as const;
export type AllocationStatus = (typeof allocationStatusOptions)[number];

/** Allocation fields, all optional on legacy rows but always normalised. */
export type AllocationFields = {
  allocationStatus: AllocationStatus;
  /** Committee code the delegate is assigned to (empty until allocated). */
  allocatedCommittee: string;
  /** Country / portfolio assigned in that committee. */
  allocatedPortfolio: string;
  /** Private notes for the secretariat (never shown publicly). */
  allocationNotes: string;
  /** ISO timestamp of the last allocation edit (empty until edited). */
  updatedAt: string;
};

export const emptyAllocation = (): AllocationFields => ({
  allocationStatus: "pending",
  allocatedCommittee: "",
  allocatedPortfolio: "",
  allocationNotes: "",
  updatedAt: "",
});

export type RegistrationRecord = RegistrationInput &
  AllocationFields & {
    id: string;
    createdAt: string;
    status: "submitted";
  };

/**
 * Server-side schema for a secretariat allocation edit. `allocatedPortfolio`
 * is free text (delegates may receive a country, portfolio or position).
 */
export const allocationUpdateSchema = z
  .object({
    allocationStatus: z.enum(allocationStatusOptions),
    allocatedCommittee: z.string().trim().max(12),
    allocatedPortfolio: z.string().trim().max(80),
    allocationNotes: z.string().trim().max(1000),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.allocatedCommittee && !committeeCodeOptions.includes(data.allocatedCommittee)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allocatedCommittee"],
        message: "Select a valid committee.",
      });
    }
    if (data.allocationStatus === "allocated" && !data.allocatedCommittee) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["allocatedCommittee"],
        message: "Choose a committee before marking a delegate as allocated.",
      });
    }
  });

export type AllocationUpdate = z.infer<typeof allocationUpdateSchema>;

/** Applies server-side string sanitisation to a raw payload clone. */
export function sanitizePayload(raw: Record<string, unknown> | null): Record<string, unknown> {
  if (!raw) return {};
  const single = ["fullName", "contactNumber", "schoolName", "grade"] as const;
  const multi = ["munHistory", "specialRequest"] as const;
  const out: Record<string, unknown> = {};

  for (const k of Object.keys(raw)) {
    const v = raw[k];
    if ((single as readonly string[]).includes(k)) out[k] = sanitizeText(v);
    else if ((multi as readonly string[]).includes(k)) out[k] = sanitizeMultiline(v);
    else if (k === "email") out[k] = normalizeEmail(v);
    else if (committeeCodeOptions.includes(k)) out[k] = sanitizeText(v);
    else out[k] = v;
  }
  return out;
}

/** Format hint for the MUN history textarea. */
export const munHistoryFormat = "MUN Name | Year | Committee | Portfolio | Award";

export { committeeCodeOptions };