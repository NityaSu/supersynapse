import { cn } from "@/lib/cn";

const PATHS = [
  "M45 35 C55 30, 65 35, 62 45 C68 50, 65 60, 55 62 C50 70, 40 68, 38 58 C30 55, 32 45, 38 42 C40 38, 42 36, 45 35Z",
  "M48 36 C46 28, 44 18, 46 10 C48 6, 52 6, 54 10 C56 18, 52 28, 50 36Z",
  "M58 40 C65 34, 75 28, 84 26 C88 26, 90 30, 88 34 C82 40, 72 42, 62 44Z",
  "M60 52 C68 56, 78 62, 84 70 C86 74, 82 78, 78 76 C70 72, 64 64, 58 56Z",
  "M50 60 C52 68, 54 78, 52 88 C50 92, 46 92, 44 88 C42 78, 46 68, 48 60Z",
  "M42 56 C36 62, 28 70, 20 74 C16 76, 12 72, 14 68 C20 60, 30 54, 38 50Z",
  "M40 44 C32 40, 22 36, 14 32 C10 30, 10 26, 14 24 C22 22, 32 28, 42 36Z",
];

export function Logo({
  size = 36,
  className,
  ring = true,
}: {
  size?: number;
  className?: string;
  ring?: boolean;
}) {
  const mark = Math.round(size * 0.9);
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center text-brand",
        className
      )}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {ring ? (
        <span className="logo-ring pointer-events-none absolute inset-[-5px] rounded-full border-[1.5px] border-brand/35" />
      ) : null}
      <svg viewBox="0 0 100 100" width={mark} height={mark} fill="currentColor">
        {PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
    </span>
  );
}

export function Wordmark({
  className,
  children = "Supersynapse",
}: {
  className?: string;
  children?: string;
}) {
  return (
    <span
      className={cn(
        "font-display text-xl font-bold tracking-[-0.6px] text-ink",
        className
      )}
    >
      {children}
    </span>
  );
}
