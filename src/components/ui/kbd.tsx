import { cn } from "@/lib/cn";

export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "rounded border border-line bg-canvas px-1.5 py-0.5 font-mono text-[10px] text-ink-muted",
        className
      )}
    >
      {children}
    </kbd>
  );
}
