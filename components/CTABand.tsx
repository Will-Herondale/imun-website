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
    <section className="bg-navy-900 text-white">
      <div className="container-site py-12 md:py-16">
        <div className="grid grid-cols-12 items-center gap-8">
          <div className="col-span-12 lg:col-span-8">
            <p className="eyebrow-doc !text-white/60">
              {reg.open ? "Seats are limited" : "Registration status"}
            </p>
            <h2 className="mt-3 font-display text-[clamp(1.6rem,3.4vw,2.3rem)] font-semibold leading-tight text-white">
              {title}
            </h2>
            <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-white/70">
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
