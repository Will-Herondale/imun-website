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
    <section className="border-b border-steel-200 bg-white">
      <div className="container-site py-10 md:py-14">
        <div className="rule-heavy" />
        <div className="mt-6 grid grid-cols-12 gap-6">
          <div className="col-span-12 lg:col-span-7">
            <p className="eyebrow-doc">{section}</p>
            <h1 className="mt-3 font-display text-[clamp(1.9rem,4.5vw,2.9rem)] font-semibold leading-[1.1] text-navy-900">
              {title}
            </h1>
          </div>
          {lede ? (
            <div className="col-span-12 lg:col-span-5 lg:pt-1">
              <p className="border-l-2 border-navy-900 pl-5 text-[1rem] leading-relaxed text-steel-600">
                {lede}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
