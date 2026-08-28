import { InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

export function Input({ label, id, name, className, ...props }: InputProps) {
  const inputId = id ?? name;
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-body font-medium text-xs text-ink-muted uppercase tracking-wide">
        {label}
      </span>
      <input
        id={inputId}
        name={name}
        className="font-body text-sm text-ink border border-border rounded-sm px-3 py-2.5 outline-none focus:border-navy transition"
        {...props}
      />
    </label>
  );
}
