import { Link } from "@tanstack/react-router";

export function Logo({ inverted = false }: { inverted?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label="BizLinko home">
      <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
        <svg viewBox="0 0 24 24" className="size-5" fill="none" aria-hidden>
          <path
            d="M5 8.5a3.5 3.5 0 0 1 3.5-3.5H11v3H8.5A.5.5 0 0 0 8 8.5v7a.5.5 0 0 0 .5.5H11v3H8.5A3.5 3.5 0 0 1 5 15.5Z"
            fill="currentColor"
          />
          <path
            d="M19 15.5a3.5 3.5 0 0 1-3.5 3.5H13v-3h2.5a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.5-.5H13V5h2.5A3.5 3.5 0 0 1 19 8.5Z"
            fill="currentColor"
            opacity="0.65"
          />
        </svg>
      </span>
      <span
        className={
          inverted
            ? "text-lg font-bold tracking-tight text-navy-foreground"
            : "text-lg font-bold tracking-tight text-foreground"
        }
      >
        BizLinko
      </span>
    </Link>
  );
}
