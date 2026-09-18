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
    <section className="relative overflow-hidden bg-navy-950 text-white">
      <div className="rule-gold" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_12%_-10%,rgba(193,161,90,0.14),transparent_65%)]"
      />
      <div className="container-site relative py-14 md:py-20">
        <div className="grid grid-cols-12 items-end gap-6">
          <div className="col-span-12 lg:col-span-7">
            <p className="kicker-light">{section}</p>
            <h1 className="mt-4 font-display text-[clamp(2.1rem,5.2vw,3.6rem)] font-medium leading-[1.04] text-white">
              {title}
            </h1>
          </div>
          {lede ? (
            <div className="col-span-12 lg:col-span-5 lg:pb-2">
              <p className="border-l border-brass-500/60 pl-6 text-[1.02rem] leading-relaxed text-white/65">
                {lede}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
