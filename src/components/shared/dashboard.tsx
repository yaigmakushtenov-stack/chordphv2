import type { ReactNode } from "react";

type DashboardProps = {
  actions?: ReactNode;
  headerNavigation?: ReactNode;
  title: string;
  eyebrow?: string;
  description?: string;
  children: ReactNode;
  documentScroll?: boolean;
  mobileDocumentScroll?: boolean;
};

export function Dashboard({
  actions,
  headerNavigation,
  title,
  eyebrow,
  description,
  children,
  documentScroll = false,
  mobileDocumentScroll = false,
}: DashboardProps) {
  return (
    <section
      className={
        documentScroll
          ? "flex flex-1 flex-col rounded-xl bg-white text-[#111] shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:bg-[#121214] dark:text-[#f5f5f5]"
          : mobileDocumentScroll
          ? "flex flex-1 flex-col rounded-xl bg-white text-[#111] shadow-[0_1px_0_rgba(0,0,0,0.04)] lg:min-h-0 lg:overflow-hidden dark:bg-[#121214] dark:text-[#f5f5f5]"
          : "flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl bg-white text-[#111] shadow-[0_1px_0_rgba(0,0,0,0.04)] dark:bg-[#121214] dark:text-[#f5f5f5]"
      }
    >
      <div className="border-b border-[#ececec] px-4 py-5 sm:px-6 dark:border-[#29292c]">
        {headerNavigation ? <div className="mb-4">{headerNavigation}</div> : null}
        {eyebrow ? (
          <p className="text-[11px] font-semibold tracking-[0.22em] text-[#ed1746]">
            {eyebrow}
          </p>
        ) : null}
        <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="min-w-0 text-[30px] font-black leading-tight tracking-[-0.04em] sm:text-[40px]">
            {title}
          </h1>
          {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
        </div>
        {description ? (
          <p className="mt-2 max-w-[680px] text-[14px] leading-6 text-[#6c6c6c] dark:text-[#b4b4bc]">
            {description}
          </p>
        ) : null}
      </div>
      <div
        data-dashboard-scroll-container
        className={
          documentScroll
            ? "flex-1 p-4 sm:p-6"
            : mobileDocumentScroll
            ? "flex-1 p-4 sm:p-6 lg:min-h-0 lg:overflow-y-auto"
            : "min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"
        }
      >
        {children}
      </div>
    </section>
  );
}
