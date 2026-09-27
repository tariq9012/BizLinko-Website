import { cn } from "@/lib/utils";
import { initials } from "@/lib/format";

const palettes = [
  "bg-primary-soft text-primary",
  "bg-accent text-accent-foreground",
  "bg-secondary text-secondary-foreground",
  "bg-navy text-navy-foreground",
];

function hash(name: string) {
  return name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
}

export function LogoPlaceholder({
  name,
  size = "md",
  className,
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "size-9 text-xs rounded-lg",
    md: "size-12 text-sm rounded-xl",
    lg: "size-16 text-base rounded-2xl",
    xl: "size-20 sm:size-24 text-xl rounded-2xl",
  } as const;

  return (
    <div
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center border border-border font-semibold tracking-tight",
        palettes[hash(name) % palettes.length],
        sizes[size],
        className,
      )}
    >
      {initials(name)}
    </div>
  );
}
