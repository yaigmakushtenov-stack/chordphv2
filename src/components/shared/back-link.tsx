import Link from "next/link";
import type { ReactNode } from "react";

export function BackLink({
  children,
  href,
}: {
  children: ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-full border border-[#d9d9d9] px-3.5 text-[11px] font-bold transition hover:border-[#ed1746] hover:text-[#ed1746] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:border-[#3a3a3f]"
    >
      <span aria-hidden="true">←</span>
      {children}
    </Link>
  );
}
