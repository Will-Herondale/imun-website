"use client";

import { useMemo, useState } from "react";
import { committees } from "@/lib/config/committees";
import { site } from "@/lib/config/site";

const DESCRIPTION_TIP =
  "Fields marked * are required. Your responses are emailed to the secretariat when you submit; nothing is stored on this device.";

const HONEYPOT_CLASS = "hidden absolute -left-[9999px] top-[-9999px]";

type Values = {
  fullName: string;
  email: string;
  contactNumber: string;
  institution: string;
  grade: string;
  city: string;
  position: string;
  committeePref1: string;
  committeePref2: string;
  agendaSuggestions: string;
  munCount: string;
  ebCount: string;
  history: string;
  awards: string;
  motivation: string;
  approach: string;
  difficultMoment: string;
  availabilityFull: boolean;
  availabilityCalls: boolean;
  declarationAccurate: boolean;
  declarationRules: boolean;
};

type Touched = Partial<Record<keyof Values, boolean>>;

const initialValues: Values = {
  fullName: "",
  email: "",
  contactNumber: "",
  institution: "",
  grade: "",
  city: "",
  position: "",
  committeePref1: "",
  committeePref2: "",
  agendaSuggestions: "",
  munCount: "",
  ebCount: "",
  history: "",
  awards: "",
  motivation: "",
  approach: "",
  difficultMoment: "",
  availabilityFull: false,
  availabilityCalls: false,
  declarationAccurate: false,
  declarationRules: false,
};

function validate(v: Values) {
  const errors: Partial<Record<keyof Values, string>> = {};
  if (v.fullName.trim().length < 2) errors.fullName = "Please enter your full name.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email.trim())) errors.email = "Enter a valid email address.";
  const digits = v.contactNumber.replace(/\D/g, "");
  if (!/^(\+91)?\d{10}$/.test(v.contactNumber.replace(/\s/g, "")) || digits.length !== 10)
    errors.contactNumber = "Enter a valid 10-digit Indian mobile number.";
  if (v.institution.trim().length < 2) errors.institution = "Please enter your school or college name.";
  if (v.grade.trim().length === 0) errors.grade = "Please enter your grade / class / year.";
  if (v.city.trim().length === 0) errors.city = "Please enter your city.";
  if (!v.position) errors.position = "Choose the position you are applying for.";
  if (!v.committeePref1) errors.committeePref1 = "Select a committee.";
  const prefs = [v.committeePref1, v.committeePref2].filter(Boolean);
  if (new Set(prefs).size !== prefs.length) errors.committeePref2 = "Choose two different committees.";
  if (!v.munCount) errors.munCount = "Select how many MUNs you have attended.";
  if (!v.ebCount) errors.ebCount = "Select how many times you have served on the dais.";
  if (v.motivation.trim().length < 30) errors.motivation = "Tell us a little more — at least a few sentences.";
  if (!v.declarationAccurate) errors.declarationAccurate = "Please confirm before submitting.";
  if (!v.declarationRules) errors.declarationRules = "Please confirm before submitting.";
  return errors;
}

export function EBApplicationForm() {
  const [values, setValues] = useState<Values>(initialValues);
  const [touched, setTouched] = useState<Touched>({});
  const errors = useMemo(() => validate(values), [values]);
  const usedCommittees = useMemo(
    () =>
      new Set([values.committeePref1, values.committeePref2].filter(Boolean)),
    [values.committeePref1, values.committeePref2],
  );

  const set = <K extends keyof Values>(key: K, value: Values[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));
  const markTouched = (key: keyof Values) => setTouched((t) => ({ ...t, [key]: true }));

  const showError = (key: keyof Values) =>
    touched[key] && errors[key] ? <p className="field-error" role="alert">{errors[key]}</p> : null;

  const line = (label: string, value: string) => `${label}: ${value || "—"}`;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])) as Touched);
    if (Object.keys(errors).length > 0) {
      const first = document.querySelector<HTMLElement>("[aria-invalid='true']");
      first?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    const name = values.fullName.trim();
    const q = committees.find((c) => c.code === values.committeePref1)?.name ?? values.committeePref1;
    const body = [
      "Executive Board application — IMUN 2026",
      "",
      line("Position applied for", values.position),
      line("Full name", name),
      line("Email", values.email),
      line("Phone", values.contactNumber),
      line("School / College", values.institution),
      line("Grade / Class", values.grade),
      line("City", values.city),
      "",
      "Committee preferences",
      line("First", q || "—"),
      line("Second", values.committeePref2 || "—"),
      line("Suggested agenda topics", values.agendaSuggestions.replace(/\n/g, " | ") || "—"),
      "",
      "Experience",
      line("MUNs attended", values.munCount),
      line("Times on the dais", values.ebCount),
      "Previous dais roles:",
      values.history.trim() || "—",
      line("Awards / distinctions", values.awards || "—"),
      "",
      "Chairing approach",
      `Why do you want to join the dais at IMUN?:\n${values.motivation}`,
      `What does strong chairing look like?:`,
      values.approach.trim() || "—",
      `A difficult moment you handled:`,
      values.difficultMoment.trim() || "—",
      "",
      line("Available for the full conference (10–11 Oct 2026)", values.availabilityFull ? "Yes" : "No"),
      line("Available for EB preparation calls", values.availabilityCalls ? "Yes" : "No"),
    ].join("\n");
    const mailto = `mailto:${site.contact.email}?subject=${encodeURIComponent(`EB Application — ${name}`)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailto;
  };

  const committeeSelect = (
    key: "committeePref1" | "committeePref2",
    label: string,
    required: boolean,
  ) => (
    <div>
      <label className="field-label" htmlFor={`f-${key}`}>
        {label} {required ? <span aria-hidden="true" className="text-[#b42318]">*</span> : null}
      </label>
      <select
        id={`f-${key}`} name={key} className="select" value={values[key]} required={required}
        onChange={(e) => set(key, e.target.value)}
        onBlur={() => markTouched(key)}
        aria-invalid={touched[key] && errors[key] ? true : undefined}
        aria-describedby={errors[key] ? `err-${key}` : undefined}
      >
        <option value="" disabled>{required ? "Select a committee…" : "Optional — select a committee…"}</option>
        {committees.map((c) => (
          <option key={c.code} value={c.code} disabled={usedCommittees.has(c.code) && values[key] !== c.code} data-code={c.code}>
            {c.name}
          </option>
        ))}
      </select>
      {showError(key)}
    </div>
  );

  return (
    <form onSubmit={submit} noValidate>
      <p className="mb-8 text-[0.9rem] text-steel-500">{DESCRIPTION_TIP}</p>

      <fieldset>
        <legend className="flex w-full items-center gap-4 border-b border-steel-200 pb-4">
          <span aria-hidden="true" className="font-display text-[1.4rem] leading-none text-brass-600">01</span>
          <span className="font-display text-[1.5rem] font-medium text-navy-900 sm:text-[1.7rem]">Personal details</span>
        </legend>

        <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="f-fullName">1. Full Name <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <input id="f-fullName" name="fullName" type="text" autoComplete="name" className="input" value={values.fullName} required
              onChange={(e) => set("fullName", e.target.value)}
              onBlur={() => markTouched("fullName")}
              aria-invalid={touched.fullName && errors.fullName ? true : undefined}
              aria-describedby={errors.fullName ? "err-fullName" : undefined} />
            {showError("fullName")}
          </div>

          <div>
            <label className="field-label" htmlFor="f-email">2. Email Address <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <input id="f-email" name="email" type="email" autoComplete="email" inputMode="email" className="input" value={values.email} required
              onChange={(e) => set("email", e.target.value)}
              onBlur={() => markTouched("email")}
              aria-invalid={touched.email && errors.email ? true : undefined}
              aria-describedby={errors.email ? "err-email" : undefined} />
            <span className="field-hint">Committee allotment and prep calls go here.</span>
            {showError("email")}
          </div>

          <div>
            <label className="field-label" htmlFor="f-contactNumber">3. Phone Number (WhatsApp if possible) <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <input id="f-contactNumber" name="contactNumber" type="tel" autoComplete="tel-national" inputMode="tel" className="input" value={values.contactNumber} required placeholder="e.g. 98XXXXXXXX"
              onChange={(e) => set("contactNumber", e.target.value)}
              onBlur={() => markTouched("contactNumber")}
              aria-invalid={touched.contactNumber && errors.contactNumber ? true : undefined}
              aria-describedby={errors.contactNumber ? "err-contactNumber" : undefined} />
            <span className="field-hint">Indian mobile number (10 digits, may start with +91).</span>
            {showError("contactNumber")}
          </div>

          <div>
            <label className="field-label" htmlFor="f-institution">4. School / College <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <input id="f-institution" name="institution" type="text" autoComplete="organization" className="input" value={values.institution} required
              onChange={(e) => set("institution", e.target.value)}
              onBlur={() => markTouched("institution")}
              aria-invalid={touched.institution && errors.institution ? true : undefined}
              aria-describedby={errors.institution ? "err-institution" : undefined} />
            {showError("institution")}
          </div>

          <div className="sm:max-w-xs">
            <label className="field-label" htmlFor="f-grade">5. Grade / Class / Year of Study <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <input id="f-grade" name="grade" type="text" className="input" value={values.grade} required placeholder="e.g. Class 12 or B.A. I year"
              onChange={(e) => set("grade", e.target.value)}
              onBlur={() => markTouched("grade")}
              aria-invalid={touched.grade && errors.grade ? true : undefined}
              aria-describedby={errors.grade ? "err-grade" : undefined} />
            {showError("grade")}
          </div>

          <div className="sm:max-w-xs">
            <label className="field-label" htmlFor="f-city">6. City <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <input id="f-city" name="city" type="text" autoComplete="address-level2" className="input" value={values.city} required
              onChange={(e) => set("city", e.target.value)}
              onBlur={() => markTouched("city")}
              aria-invalid={touched.city && errors.city ? true : undefined}
              aria-describedby={errors.city ? "err-city" : undefined} />
            {showError("city")}
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-14">
        <legend className="flex w-full items-center gap-4 border-b border-steel-200 pb-4">
          <span aria-hidden="true" className="font-display text-[1.4rem] leading-none text-brass-600">02</span>
          <span className="font-display text-[1.5rem] font-medium text-navy-900 sm:text-[1.7rem]">Role and committee preferences</span>
        </legend>

        <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <div className="sm:max-w-xs">
            <label className="field-label" htmlFor="f-position">7. Position you are applying for <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <select id="f-position" name="position" className="select" value={values.position} required
              onChange={(e) => set("position", e.target.value)}
              onBlur={() => markTouched("position")}
              aria-invalid={touched.position && errors.position ? true : undefined}
              aria-describedby={errors.position ? "err-position" : undefined}>
              <option value="" disabled>Select a position…</option>
              <option value="Chairperson">Chairperson</option>
              <option value="Vice-Chairperson">Vice-Chairperson</option>
              <option value="Either — flexible">Either — flexible</option>
            </select>
            {showError("position")}
          </div>
          <div className="flex items-end pb-1">
            <p className="text-[0.85rem] leading-relaxed text-steel-500">
              The four committees of the session are DISEC, UNHRC, the Lok Sabha and the Continuous Crisis Committee. Placements are confirmed by the secretariat after shortlisting.
            </p>
          </div>

          {committeeSelect("committeePref1", "8. First Committee Preference", true)}
          {committeeSelect("committeePref2", "9. Second Committee Preference", false)}

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="f-agendaSuggestions">10. Suggested agenda topics for your first preference</label>
            <textarea id="f-agendaSuggestions" name="agendaSuggestions" rows={4} className="textarea"
              value={values.agendaSuggestions}
              onChange={(e) => set("agendaSuggestions", e.target.value)}
              placeholder="One topic per line, e.g.&#10;Preventing the weaponisation of outer space&#10;Regulating autonomous weapons systems" />
            <span className="field-hint">Propose up to two agenda topics you would bring to your first committee preference, one per line.</span>
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-14">
        <legend className="flex w-full items-center gap-4 border-b border-steel-200 pb-4">
          <span aria-hidden="true" className="font-display text-[1.4rem] leading-none text-brass-600">03</span>
          <span className="font-display text-[1.5rem] font-medium text-navy-900 sm:text-[1.7rem]">MUN and dais experience</span>
        </legend>

        <div className="mt-6 grid gap-x-6 gap-y-5 sm:grid-cols-2">
          <div className="sm:max-w-xs">
            <label className="field-label" htmlFor="f-munCount">11. How many MUNs have you attended? <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <select id="f-munCount" name="munCount" className="select" value={values.munCount} required
              onChange={(e) => set("munCount", e.target.value)}
              onBlur={() => markTouched("munCount")}
              aria-invalid={touched.munCount && errors.munCount ? true : undefined}
              aria-describedby={errors.munCount ? "err-munCount" : undefined}>
              <option value="" disabled>Select…</option>
              <option value="None — first MUN">None — this would be my first MUN</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5+">5 or more</option>
            </select>
            {showError("munCount")}
          </div>

          <div className="sm:max-w-xs">
            <label className="field-label" htmlFor="f-ebCount">12. How many times have you served on the dais? <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <select id="f-ebCount" name="ebCount" className="select" value={values.ebCount} required
              onChange={(e) => set("ebCount", e.target.value)}
              onBlur={() => markTouched("ebCount")}
              aria-invalid={touched.ebCount && errors.ebCount ? true : undefined}
              aria-describedby={errors.ebCount ? "err-ebCount" : undefined}>
              <option value="" disabled>Select…</option>
              <option value="None">None — first time applying for the dais</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="3+">3 or more</option>
            </select>
            {showError("ebCount")}
          </div>

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="f-history">13. Previous dais roles</label>
            <textarea id="f-history" name="history" rows={5} className="textarea font-mono text-[0.85rem]"
              value={values.history}
              onChange={(e) => set("history", e.target.value)}
              placeholder={`One role per line, strictly as:\nMUN Name | Year | Committee | Role`} />
            <span className="field-hint">
              Use exactly this format, one role per line:
              <code className="mt-1 block rounded-[3px] bg-steel-100 px-2 py-1 text-[0.75rem]">
                MUN Name | Year | Committee | Role
              </code>
              Example: <code className="inline-block rounded bg-steel-100 px-1.5">City MUN 2025 | DISEC | Chairperson</code>
            </span>
          </div>

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="f-awards">14. Distinctions while on the dais or as a delegate</label>
            <input id="f-awards" name="awards" type="text" className="input" value={values.awards}
              onChange={(e) => set("awards", e.target.value)}
              placeholder="e.g. Best delegate x2, best vice-chairperson" />
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-14">
        <legend className="flex w-full items-center gap-4 border-b border-steel-200 pb-4">
          <span aria-hidden="true" className="font-display text-[1.4rem] leading-none text-brass-600">04</span>
          <span className="font-display text-[1.5rem] font-medium text-navy-900 sm:text-[1.7rem]">Chairing approach</span>
        </legend>

        <div className="mt-6 grid gap-x-6 gap-y-5">
          <div>
            <label className="field-label" htmlFor="f-motivation">15. Why do you want to join the dais at IMUN 2026? <span aria-hidden="true" className="text-[#b42318]">*</span></label>
            <textarea id="f-motivation" name="motivation" rows={5} className="textarea" value={values.motivation}
              onChange={(e) => set("motivation", e.target.value)}
              onBlur={() => markTouched("motivation")}
              aria-invalid={touched.motivation && errors.motivation ? true : undefined}
              aria-describedby={errors.motivation ? "err-motivation" : undefined} />
            {showError("motivation")}
          </div>

          <div>
            <label className="field-label" htmlFor="f-approach">16. What does strong chairing look like to you?</label>
            <textarea id="f-approach" name="approach" rows={4} className="textarea" value={values.approach}
              onChange={(e) => set("approach", e.target.value)}
              placeholder="How do you keep debate moving, keep the Rules of Procedure workable, and treat rookie delegates?" />
          </div>

          <div>
            <label className="field-label" htmlFor="f-difficultMoment">17. Describe a difficult moment you have handled on a dais</label>
            <textarea id="f-difficultMoment" name="difficultMoment" rows={4} className="textarea" value={values.difficultMoment}
              onChange={(e) => set("difficultMoment", e.target.value)}
              placeholder="Did a delegate break rules, an agenda stall, or a motion get challenged? How did you bring the room back under control?" />
          </div>

          <div className="space-y-4 sm:col-span-2">
            <div className="flex items-start gap-3">
              <input id="f-availabilityFull" name="availabilityFull" type="checkbox" className="mt-1 h-5 w-5 accent-[#0e284c]" checked={values.availabilityFull}
                onChange={(e) => set("availabilityFull", e.target.checked)} />
              <label htmlFor="f-availabilityFull" className="text-[0.95rem] leading-relaxed text-navy-800">
                18. I can attend the full conference on 24–25 October 2026.
              </label>
            </div>
            <div className="flex items-start gap-3">
              <input id="f-availabilityCalls" name="availabilityCalls" type="checkbox" className="mt-1 h-5 w-5 accent-[#0e284c]" checked={values.availabilityCalls}
                onChange={(e) => set("availabilityCalls", e.target.checked)} />
              <label htmlFor="f-availabilityCalls" className="text-[0.95rem] leading-relaxed text-navy-800">
                19. I can join EB preparation calls with the secretariat.
              </label>
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset className="mt-14">
        <legend className="flex w-full items-center gap-4 border-b border-steel-200 pb-4">
          <span aria-hidden="true" className="font-display text-[1.4rem] leading-none text-brass-600">05</span>
          <span className="font-display text-[1.5rem] font-medium text-navy-900 sm:text-[1.7rem]">Declaration</span>
        </legend>

        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3">
            <input id="f-declarationAccurate" name="declarationAccurate" type="checkbox" className="mt-1 h-5 w-5 accent-[#0e284c]" checked={values.declarationAccurate}
              onChange={(e) => set("declarationAccurate", e.target.checked)}
              onBlur={() => markTouched("declarationAccurate")}
              aria-invalid={touched.declarationAccurate && errors.declarationAccurate ? true : undefined}
              aria-describedby={errors.declarationAccurate ? "err-declarationAccurate" : undefined} />
            <label htmlFor="f-declarationAccurate" className="text-[0.95rem] leading-relaxed text-navy-800">
              20. I confirm that the information provided above is accurate.
              <span aria-hidden="true" className="text-[#b42318]"> *</span>
            </label>
          </div>
          <div className="flex items-start gap-3">
            <input id="f-declarationRules" name="declarationRules" type="checkbox" className="mt-1 h-5 w-5 accent-[#0e284c]" checked={values.declarationRules}
              onChange={(e) => set("declarationRules", e.target.checked)}
              onBlur={() => markTouched("declarationRules")}
              aria-invalid={touched.declarationRules && errors.declarationRules ? true : undefined}
              aria-describedby={errors.declarationRules ? "err-declarationRules" : undefined} />
            <label htmlFor="f-declarationRules" className="text-[0.95rem] leading-relaxed text-navy-800">
              21. I agree to uphold the conduct and confidentiality expected of the Executive Board.
              <span aria-hidden="true" className="text-[#b42318]"> *</span>
            </label>
          </div>
        </div>
      </fieldset>

      <div className={HONEYPOT_CLASS} aria-hidden="true">
        <label htmlFor="f-website">Leave this field empty</label>
        <input id="f-website" name="website" type="text" tabIndex={-1} autoComplete="off" value="" readOnly />
      </div>

      <div className="mt-12 border-t border-steel-200 pt-8">
        <div className="flex flex-wrap items-center gap-4">
          <button type="submit" className="btn btn-primary min-w-[13rem]">Submit application</button>
          <p className="text-[0.8rem] text-steel-500">Application opens in your mail app, addressed to the secretariat.</p>
        </div>
        <p className="mt-5 text-[0.8rem] leading-relaxed text-steel-400">
          Applications are reviewed by the secretariat and you will be contacted at the email you provided. Information
          here is used solely to shortlist the Executive Board and is not shared beyond the organiser&apos;s secretariat.
          See the <a href="/privacy" className="underline decoration-brass-600 underline-offset-2">privacy notice</a>.
        </p>
      </div>
    </form>
  );
}