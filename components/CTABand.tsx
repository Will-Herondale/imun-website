import Link from "next/link";
import { registrationStatus } from "@/lib/registration-control";

export function CTABand({
  title = "Register as a delegate",
  body,
}: {
  title?: string;
  body?: string;
}) {
  const reg = registrationStatus();
  return (
    <section className="relative overflow-hidden bg-navy-950 text-white no-print">
      <div className="rule-gold" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_130%_at_85%_0%,rgba(193,161,90,0.16),transparent_65%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-24 -right-16 hidden h-72 w-72 rounded-full border border-brass-500/15 md:block"
      />
      <div className="container-site relative py-16 md:py-24">
        <div className="grid grid-cols-12 items-center gap-10">
          <div className="col-span-12 lg:col-span-8">
            <p className="kicker-light">{reg.open ? "Seats are limited" : "Registration status"}</p>
            <h2 className="mt-4 font-display text-[clamp(1.9rem,4vw,3rem)] font-medium leading-[1.08] text-white">
              {title}
            </h2>
            <p className="mt-5 max-w-2xl text-[1.02rem] leading-relaxed text-white/65">
              {body ??
                (reg.open
                  ? "Committee seats are allotted in the order registrations are processed. Submitting early improves your chances of holding your first preference."
                  : "Registration for this session is currently closed. The form reopens when the secretariat announces the next phase.")}
            </p>
          </div>
          <div className="col-span-12 flex flex-col gap-3 lg:col-span-4 lg:items-end">
            <Link href="/registration" className="btn btn-accent w-full lg:w-auto">
              {reg.open ? "Begin registration" : "View registration information"}
            </Link>
            <Link href="/faq" className="btn btn-outline-light w-full lg:w-auto">
              Read the FAQ
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
