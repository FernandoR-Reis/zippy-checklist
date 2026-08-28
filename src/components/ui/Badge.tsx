import { PropsWithChildren } from "react";
import { clsx } from "@/lib/clsx";

type Tone = "idle" | "progress" | "done" | "late";

const toneStyles: Record<Tone, string> = {
  idle: "bg-[#EEF0F9] text-ink-muted",
  progress: "bg-[#FFF1E2] text-orange-dark",
  done: "bg-success-soft text-success-text",
  late: "bg-danger-soft text-danger-text",
};

const dotStyles: Record<Tone, string> = {
  idle: "bg-[#9EA3C4]",
  progress: "bg-orange",
  done: "bg-success",
  late: "bg-danger",
};

export function Badge({ tone, children }: PropsWithChildren<{ tone: Tone }>) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-body font-semibold text-xs rounded-full pl-2 pr-3 py-1.5",
        toneStyles[tone]
      )}
    >
      <span className={clsx("w-1.5 h-1.5 rounded-full", dotStyles[tone])} />
      {children}
    </span>
  );
}
