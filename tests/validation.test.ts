import { describe, it, expect } from "vitest";
import {
  registrationSchema,
  sanitizeText,
  sanitizeMultiline,
  normalizeEmail,
  isIndianMobile,
  sanitizePayload,
} from "@/lib/validation/registration";

function validPayload(overrides: Record<string, unknown> = {}) {
  return {
    fullName: "Aarav Sharma",
    email: "aarav.sharma@example.com",
    contactNumber: "98765 43210",
    schoolName: "St Xavier's Collegiate School",
    grade: "11",
    munCount: "1",
    munHistory: "Harvest MUN | 2026 | DISEC | Delegate | Special Mention",
    committeePref1: "DISEC",
    committeePref2: "UNHRC",
    committeePref3: "LS",
    countryPreference: "India",
    specialRequest: "Sibling seated in the same committee.",
    paymentReference: "UTR123456789012",
    declarationAccurate: "Yes",
    declarationRules: "Yes",
    website: "",
    ...overrides,
  };
}

describe("registrationSchema", () => {
  it("accepts a valid payload", () => {
    const result = registrationSchema.safeParse(validPayload());
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("aarav.sharma@example.com");
      expect(result.data.fullName).toBe("Aarav Sharma");
    }
  });

  it("rejects when the accuracy declaration is missing", () => {
    const out = registrationSchema.safeParse(validPayload({ declarationAccurate: "No" }));
    expect(out.success).toBe(false);
  });

  it("rejects when the rules declaration is missing", () => {
    const out = registrationSchema.safeParse(validPayload({ declarationRules: undefined }));
    expect(out.success).toBe(false);
  });

  it("rejects an invalid phone number", () => {
    const out = registrationSchema.safeParse(validPayload({ contactNumber: "1234567890" }));
    expect(out.success).toBe(false);
  });

  it("rejects non-email addresses", () => {
    const out = registrationSchema.safeParse(validPayload({ email: "helo" }));
    expect(out.success).toBe(false);
  });

  it("rejects duplicate committee preferences", () => {
    const out = registrationSchema.safeParse(
      validPayload({ committeePref1: "DISEC", committeePref2: "DISEC", committeePref3: "CCC" })
    );
    expect(out.success).toBe(false);
    expect(out.success || out.error.issues.some((i) => i.path.join(".") === "committeePrefs")).toBe(true);
  });

  it("rejects MUN history when the delegate has no conferences", () => {
    const out = registrationSchema.safeParse(
      validPayload({ munCount: "0", munHistory: "Some MUN | 2026 | DISEC | Delegate | –" })
    );
    expect(out.success).toBe(false);
  });

  it("rejects unknown keys (strict schema)", () => {
    const out = registrationSchema.safeParse(validPayload({ admin: "root" }));
    expect(out.success).toBe(false);
  });

  it("rejects when no payment information is supplied", () => {
    const out = registrationSchema.safeParse(
      validPayload({ paymentReference: "", paymentOrderId: "" })
    );
    expect(out.success).toBe(false);
  });

  it("accepts an automated payment order id without a manual reference", () => {
    const out = registrationSchema.safeParse(
      validPayload({ paymentReference: "", paymentOrderId: "fg_abc123" })
    );
    expect(out.success).toBe(true);
  });
});

describe("sanitizers", () => {
  it("strips control characters and normalises whitespace", () => {
    expect(sanitizeText("  Aarav\u0000 Sharma \t ")).toBe("Aarav Sharma");
  });

  it("normalises email addresses to lowercase", () => {
    expect(normalizeEmail("  AARAV@Example.COM ")).toBe("aarav@example.com");
  });

  it("collapses consecutive blank lines in multiline input", () => {
    expect(sanitizeMultiline("Line one\n\n\nLine two\n")).toBe("Line one\n\nLine two");
  });

  it("keeps the honeypot field untouched in sanitizePayload", () => {
    const out = sanitizePayload({ fullName: " A ", email: "A@b.co", website: "http://spam" });
    expect(out.website).toBe("http://spam");
  });
});

describe("isIndianMobile", () => {
  it.each(["9876543210", "+91 9876543210", "09876543210", "98765-43210"])(
    "accepts %s",
    (phone) => expect(isIndianMobile(phone)).toBe(true)
  );
  it.each(["1234567890", "98765", "asdfghjk12", "1876543210"])("rejects %s", (phone) =>
    expect(isIndianMobile(phone)).toBe(false)
  );
});