import { cn } from "@/lib/cn";

export function Avatar({
  initials = "SS",
  size = "md",
}: {
  initials?: string;
  size?: "sm" | "md";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full bg-[linear-gradient(135deg,#fb923c,#ff6600)] font-semibold text-white",
        size === "sm" ? "size-7 text-[11px]" : "size-8 text-xs"
      )}
    >
      {initials}
    </div>
  );
}
