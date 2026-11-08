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

export function Badge({ tone, size = "default", children }: PropsWithChildren<{ tone: Tone; size?: "default" | "small" }>) {
  return (
    <span
      className={clsx(
        "inline-flex items-center font-body font-semibold rounded-full",
        size === "small"
          ? "gap-1 text-[9px] leading-3 pl-1.5 pr-2 py-0.5"
          : "gap-1.5 text-xs pl-2 pr-3 py-1.5",
        toneStyles[tone]
      )}
    >
      <span className={clsx("rounded-full", size === "small" ? "w-1 h-1" : "w-1.5 h-1.5", dotStyles[tone])} />
      {children}
    </span>
  );
}
