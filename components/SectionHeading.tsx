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
      <div
        className={`mb-6 h-px w-14 bg-brass-500 ${align === "center" ? "mx-auto" : ""}`}
        aria-hidden="true"
      />
      <div className={`flex items-baseline gap-3 ${align === "center" ? "justify-center" : ""}`}>
        {index ? (
          <span className={dark ? "doc-index !text-brass-300" : "doc-index"}>{index}</span>
        ) : null}
        {kicker ? <p className={dark ? "kicker-light" : "kicker"}>{kicker}</p> : null}
      </div>
      <h2
        id={id}
        className={`mt-3 font-display text-[clamp(1.75rem,3.6vw,2.6rem)] font-medium leading-[1.12] ${
          dark ? "!text-white" : "text-navy-900"
        }`}
      >
        {title}
      </h2>
      {intro ? (
        <p className={`mt-5 text-[1rem] leading-relaxed ${dark ? "text-white/70" : "text-steel-600"}`}>
          {intro}
        </p>
      ) : null}
    </Reveal>
  );
}
