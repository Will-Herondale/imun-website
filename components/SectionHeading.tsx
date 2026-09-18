import { Reveal } from "@/components/Reveal";

export function SectionHeading({
  kicker,
  title,
  intro,
  align = "left",
  id,
  index,
  tone = "light",
}: {
  kicker?: string;
  title: string;
  intro?: string;
  align?: "left" | "center";
  id?: string;
  /** Document section marker, e.g. "1" or "Part II". */
  index?: string;
  tone?: "light" | "dark";
}) {
  const dark = tone === "dark";
  return (
    <Reveal className={`max-w-3xl ${align === "center" ? "mx-auto text-center" : ""}`}>
      <div className={`rule-heavy mb-5 ${dark ? "!bg-white/25" : ""}`} aria-hidden="true" />
      <div className={`flex items-baseline gap-3 ${align === "center" ? "justify-center" : ""}`}>
        {index ? <span className={dark ? "doc-index !text-white" : "doc-index"}>{index}</span> : null}
        {kicker ? <p className={`eyebrow-doc ${dark ? "!text-white/60" : ""}`}>{kicker}</p> : null}
      </div>
      <h2
        id={id}
        className={`mt-3 font-display text-[clamp(1.6rem,3.2vw,2.2rem)] font-semibold leading-[1.15] ${
          dark ? "!text-white" : "text-navy-900"
        }`}
      >
        {title}
      </h2>
      {intro ? (
        <p className={`mt-4 text-[0.98rem] leading-relaxed ${dark ? "text-white/70" : "text-steel-600"}`}>
          {intro}
        </p>
      ) : null}
    </Reveal>
  );
}
