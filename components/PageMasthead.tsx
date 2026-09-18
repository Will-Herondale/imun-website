import { BrandLogo } from "@/components/BrandLogo";

export function PageMasthead({
  section,
  title,
  lede,
}: {
  section: string;
  title: string;
  lede?: string;
}) {
  return (
    <section className="section-tight relative overflow-hidden border-b border-steel-100 bg-steel-50/60">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 top-1/2 hidden -translate-y-1/2 lg:block"
      >
        <BrandLogo tone="onLight" className="h-[24rem] w-[24rem] opacity-[0.05]" />
      </div>
      <div className="container-site relative">
        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7">
            <p className="kicker flex items-center gap-3">
              <span aria-hidden="true" className="inline-block h-px w-8 bg-azure-600/70" />
              {section}
            </p>
            <h1 className="mt-4 text-[clamp(2.2rem,5vw,3.4rem)] font-medium leading-[1.08] text-navy-900">
              {title}
            </h1>
          </div>
          {lede ? (
            <div className="col-span-12 lg:col-span-5 lg:pt-14">
              <p className="border-l-2 border-azure-500 pl-5 text-[1.05rem] leading-relaxed text-steel-600">
                {lede}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}