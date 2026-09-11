import { cn } from "@/lib/cn";

export function SpaceBadge({
  label,
  background,
  color,
}: {
  label: string;
  background: string;
  color: string;
}) {
  return (
    <span
      className="rounded-full px-2.5 py-0.5 text-[10px] font-bold tracking-wide uppercase"
      style={{ background, color }}
    >
      {label}
    </span>
  );
}

export function Overlay({
  open,
  onClick,
  className,
}: {
  open: boolean;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-0 bg-black/30 opacity-0 transition-opacity",
        open && "pointer-events-auto opacity-100",
        className
      )}
      onClick={onClick}
    />
  );
}
