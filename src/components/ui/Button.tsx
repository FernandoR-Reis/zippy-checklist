import { ButtonHTMLAttributes } from "react";
import { clsx } from "@/lib/clsx";

type Variant = "primary" | "secondary" | "outline" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
}

const styles: Record<Variant, string> = {
  primary: "bg-orange text-white shadow-[0_8px_18px_-8px_rgba(245,130,31,0.6)]",
  secondary: "bg-navy text-white",
  outline: "bg-surface text-navy border-[1.5px] border-navy",
  danger: "bg-danger text-white",
  ghost: "bg-transparent text-navy",
};

export function Button({ variant = "primary", className, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        "font-body font-semibold text-sm rounded-md px-4 py-2.5 transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none",
        styles[variant],
        className
      )}
      {...props}
    />
  );
}
