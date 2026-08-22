import type { ReactNode } from "react";

type DashboardProps = {
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
};

export function Dashboard({
  title,
  eyebrow,
  description,
  children,
}: DashboardProps) {
  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white text-[#111] shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:bg-[#121214] dark:text-[#f5f5f5]">
      <div className="border-b border-[#ececec] px-4 py-5 sm:px-6 dark:border-[#29292c]">
        {eyebrow ? (
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#ed1746]">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="mt-2 text-[30px] font-black leading-tight tracking-[-0.04em] sm:text-[40px]">
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-[680px] text-[14px] leading-6 text-[#6c6c6c] dark:text-[#b4b4bc]">
            {description}
          </p>
        ) : null}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">{children}</div>
    </section>
  );
}
