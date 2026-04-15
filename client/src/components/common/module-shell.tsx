import type { ComponentType, ReactNode } from "react";
import { Activity } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "amber" | "emerald" | "sky" | "rose";

type HeroStat = {
  label: string;
  value: string;
  helper: string;
};

const heroAccentClasses: Record<Tone, string> = {
  amber: "bg-[linear-gradient(135deg,rgba(214,255,46,0.08),rgba(26,24,18,0.96)_44%,rgba(89,57,24,0.14))]",
  emerald: "bg-[linear-gradient(135deg,rgba(214,255,46,0.08),rgba(18,19,15,0.96)_44%,rgba(15,72,52,0.18))]",
  sky: "bg-[linear-gradient(135deg,rgba(214,255,46,0.08),rgba(17,18,15,0.96)_44%,rgba(29,54,65,0.16))]",
  rose: "bg-[linear-gradient(135deg,rgba(214,255,46,0.06),rgba(18,17,15,0.96)_44%,rgba(95,44,30,0.14))]",
};

function HeroStatCard({ label, value, helper }: HeroStat) {
  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-[#737762]">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm text-[#9ba18a]">{helper}</p>
    </div>
  );
}

export function ModulePage({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-transparent px-6 pb-12 pt-10 text-white sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-8">{children}</div>
    </main>
  );
}

export function ModuleHero({
  eyebrow,
  title,
  description,
  stats,
  tone = "amber",
  icon: Icon = Activity,
}: {
  eyebrow: string;
  title: string;
  description: string;
  stats: HeroStat[];
  tone?: Tone;
  icon?: ComponentType<{ className?: string }>;
}) {
  return (
    <section className={`panel-grid rounded-[32px] border border-white/8 p-8 shadow-[0_24px_90px_rgba(2,8,23,0.42)] ${heroAccentClasses[tone]}`}>
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs font-medium uppercase tracking-[0.24em] text-[#d7ff49]">
            <Icon className="size-3.5" />
            {eyebrow}
          </div>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white sm:text-5xl">{title}</h1>
          <p className="mt-4 text-sm leading-7 text-[#a2a791] sm:text-base">{description}</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {stats.map((stat) => (
            <HeroStatCard key={stat.label} {...stat} />
          ))}
        </div>
      </div>
    </section>
  );
}

export function PanelShell({
  title,
  description,
  children,
  actions,
  className,
  contentClassName,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  actions?: ReactNode;
  className?: string;
  contentClassName?: string;
}) {
  return (
    <section className={cn("panel-grid rounded-[28px] border border-white/8 bg-[linear-gradient(180deg,rgba(26,24,20,0.9),rgba(16,15,12,0.94))] shadow-[0_18px_50px_rgba(2,8,23,0.34)]", className)}>
      <div className="flex flex-col gap-3 px-6 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white">{title}</h2>
          {description ? <p className="mt-2 text-sm text-[#979c88]">{description}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
      </div>
      <div className={cn("px-6 pb-6 pt-5", contentClassName)}>{children}</div>
    </section>
  );
}

export function SplitLayout({
  left,
  right,
  ratio = "balanced",
}: {
  left: ReactNode;
  right: ReactNode;
  ratio?: "balanced" | "detail";
}) {
  const layoutClass =
    ratio === "detail" ? "xl:grid-cols-[0.92fr_1.08fr]" : "xl:grid-cols-[1fr_1fr]";

  return <section className={`grid gap-6 ${layoutClass}`}>{left}{right}</section>;
}
