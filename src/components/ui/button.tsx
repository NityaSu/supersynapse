import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const variants = {
  primary:
    "inline-flex w-full items-center justify-center gap-2 rounded-[10px] bg-brand px-2.5 py-2.5 text-sm font-semibold text-white shadow-[0_2px_8px_rgba(255,102,0,0.2)] transition hover:enabled:-translate-y-px hover:enabled:bg-brand-hover disabled:cursor-not-allowed disabled:opacity-55",
  secondary:
    "rounded-md border border-line bg-elevated px-4 py-2 text-sm font-semibold text-ink-secondary transition hover:enabled:bg-canvas disabled:opacity-55",
  ghost:
    "flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg border-0 bg-transparent text-ink-muted transition hover:bg-elevated hover:text-ink",
  nav: "mb-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-md border-0 bg-transparent px-3 py-2 text-left text-sm text-ink-secondary transition hover:bg-canvas hover:text-ink",
  chip: "shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-xs font-semibold whitespace-nowrap transition",
  quick:
    "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-[10px] border border-line bg-elevated p-2.5 text-xs font-semibold text-ink-secondary transition hover:border-line-hover hover:bg-canvas",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
};

export function Button({
  variant = "primary",
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button type={type} className={cn(variants[variant], className)} {...props} />
  );
}
