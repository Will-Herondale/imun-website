import Link from "next/link";
import { BrandLogo } from "@/components/BrandLogo";
import { Reveal } from "@/components/Reveal";
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
    <section className="grain mesh-dark relative overflow-hidden section bg-navy-900 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-28 hidden lg:block"
      >
        <BrandLogo className="h-[28rem] w-[28rem] opacity-[0.06]" />
      </div>
      <div className="container-site relative">
        <Reveal className="mx-auto max-w-2xl text-center">
          <p className="kicker flex items-center justify-center gap-3 !text-azure-300">
            <span aria-hidden="true" className="inline-block h-px w-10 bg-azure-500/70" />
            {reg.open ? "Seats are limited" : "Registration status"}
            <span aria-hidden="true" className="inline-block h-px w-10 bg-azure-500/70" />
          </p>
          <h2 className="mt-5 text-[clamp(2rem,5vw,3rem)] font-medium leading-[1.1] text-white">
            {title}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-[1.02rem] leading-relaxed text-white/70">
            {body ??
              (reg.open
                ? "Committee seats are allotted in the order registrations are processed. Submitting early improves your chances of holding your first preference."
                : "Registration for this session is currently closed. The form reopens when the secretariat announces the next phase.")}
          </p>
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link href={reg.open ? "/registration" : "/registration"} className="btn btn-accent">
              {reg.open ? "Begin registration" : "View registration information"}
            </Link>
            <Link href="/faq" className="btn btn-outline-light">
              Read the FAQ
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  );
}