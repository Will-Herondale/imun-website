import { Reveal } from "@/components/Reveal";

export function SectionHeading({
  kicker,
  title,
  intro,
  align = "left",
  id,
}: {
  kicker?: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
  id?: string;
}) {
  return (
    <Reveal
      className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}
    >
      {kicker ? (
        <p className={`kicker ${align === "center" ? "mx-auto flex items-center justify-center gap-3" : "flex items-center gap-3"}`}>
          <span aria-hidden="true" className="inline-block h-px w-8 bg-azure-600/70" />
          {kicker}
        </p>
      ) : null}
      <h2 id={id} className="mt-4 text-[clamp(1.9rem,4vw,2.8rem)] font-medium leading-[1.12] text-navy-900">
        {title}
      </h2>
      {intro ? (
        <p className="mt-5 text-[1.02rem] leading-relaxed text-steel-600">{intro}</p>
      ) : null}
    </Reveal>
  );
}