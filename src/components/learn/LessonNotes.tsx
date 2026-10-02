import { AlertOctagon, Gamepad2, Lightbulb, ListChecks, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { CodeBlock } from "@/components/CodeBlock";
import { Visual } from "@/components/learn/Visuals";
import { RunnableCode } from "@/components/learn/RunnableCode";
import { PlainWords } from "@/components/learn/PlainWords";
import { Rich } from "@/components/learn/Rich";
import { analyzerLink, type Lesson } from "@/lib/learn/lessons";
import { useLang, type TFunction } from "@/lib/prefs";
import { SIMPLE } from "@/lib/learn/simple";

export { Rich };

function Paragraph({ text }: { text: string }) {
  return (
    <p className="text-[15px] leading-[1.75] text-zinc-300">
      <Rich text={text} />
    </p>
  );
}

function Callout({
  tone,
  icon,
  title,
  children,
}: {
  tone: "brand" | "amber" | "red" | "neutral";
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  const style = {
    brand: "border-brand-line bg-brand-soft",
    amber: "border-amber-500/30 bg-amber-500/[0.06]",
    red: "border-red-500/30 bg-red-500/[0.05]",
    neutral: "border-line bg-surface-2",
  }[tone];
  const iconColor = {
    brand: "text-brand",
    amber: "text-amber-400",
    red: "text-red-400",
    neutral: "text-ink-2",
  }[tone];
  return (
    <section className={`space-y-3 rounded-2xl border p-5 ${style}`}>
      <div className="flex items-center gap-2 text-[15px] font-semibold text-zinc-100">
        <span className={iconColor}>{icon}</span>
        {title}
      </div>
      {children}
    </section>
  );
}

/** The full, long-form lesson: text, visuals, runnable samples, game notes. */
export function LessonBody({ lesson, t }: { lesson: Lesson; t: TFunction }) {
  // ModuleScript samples in this lesson, so "Using it" samples can require them.
  const modules = lesson.sections
    .filter((s) => s.code && /ModuleScript/.test(s.code.where ?? ""))
    .map((s) => ({
      name: s.code!.where!.match(/(\w+) \(ModuleScript\)/)?.[1] ?? "Module",
      code: s.code!.code,
      where: s.code!.where,
    }));
  const lang = useLang();
  const plain = SIMPLE[lesson.id];
  return (
    <>
      {plain && <PlainWords simple={plain} lang={lang} t={t} />}
      {lesson.sections.map((section, i) => (
        <section key={i} className="space-y-4">
          {section.heading && (
            <h2 className="text-xl font-semibold tracking-tight text-zinc-100">
              {section.heading}
            </h2>
          )}
          {section.text?.map((text, j) => (
            <Paragraph key={j} text={text} />
          ))}
          {section.visual && <Visual id={section.visual.id} caption={section.visual.caption} />}
          {section.list && (
            <ul className="space-y-2.5">
              {section.list.map((item, j) => (
                <li key={j} className="flex gap-3 text-[15px] leading-relaxed text-zinc-300">
                  <span
                    className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          )}
          {section.code && (
            <div className="space-y-2">
              {section.code.where && (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-surface-2 px-2 py-1 text-[12px] text-ink-2">
                  <MapPin className="h-3.5 w-3.5 text-brand" aria-hidden="true" />
                  <span className="font-mono">{section.code.where}</span>
                </div>
              )}
              <RunnableCode
                code={section.code.code}
                title={section.code.title ?? "Luau"}
                where={section.code.where}
                modules={modules}
              />
            </div>
          )}
          {section.tip && (
            <div className="flex gap-3 rounded-xl border border-sky-500/25 bg-sky-500/[0.06] p-3.5 text-sm text-zinc-200">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
              <span className="leading-relaxed">{section.tip}</span>
            </div>
          )}
        </section>
      ))}

      {lesson.game && (
        <Callout
          tone="amber"
          icon={<Gamepad2 className="h-4 w-4" aria-hidden="true" />}
          title={t("learn.inGames", { name: lesson.game.name })}
        >
          <Paragraph text={lesson.game.text} />
        </Callout>
      )}

      {lesson.tryIt && (
        <Callout
          tone="neutral"
          icon={<ListChecks className="h-4 w-4" aria-hidden="true" />}
          title={t("learn.tryIt")}
        >
          <ol className="space-y-2.5">
            {lesson.tryIt.map((step, i) => (
              <li key={i} className="flex gap-3 text-sm text-zinc-300">
                <span className="ep-step shrink-0">{i + 1}</span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </Callout>
      )}

      {lesson.mistake && (
        <Callout
          tone="red"
          icon={<AlertOctagon className="h-4 w-4" aria-hidden="true" />}
          title={t("learn.mistake")}
        >
          <CodeBlock
            code={lesson.mistake.code}
            title={t("learn.thisCode")}
            tone="bad"
            copyable={false}
          />
          <div className="code-dark rounded-xl border border-code-line bg-code px-3 py-2 font-mono text-[13px] text-red-400">
            {lesson.mistake.error}
          </div>
          <p className="text-sm text-zinc-300">{lesson.mistake.explain}</p>
          <a
            href={analyzerLink(lesson.mistake.error, lesson.mistake.code)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-brand hover:underline"
          >
            {t("learn.openAnalyzer")}
          </a>
        </Callout>
      )}
    </>
  );
}
