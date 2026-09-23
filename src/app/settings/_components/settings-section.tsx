import type { ReactNode } from "react";

type SettingsSectionProps = {
  children: ReactNode;
  description: string;
  title: string;
};

export function SettingsSection({
  children,
  description,
  title,
}: SettingsSectionProps) {
  return (
    <section className="grid gap-5 border-b border-[#ececec] py-7 first:pt-0 last:border-b-0 last:pb-0 md:grid-cols-[minmax(180px,0.7fr)_minmax(0,1.5fr)] md:gap-10 dark:border-[#29292c]">
      <div>
        <h2 className="text-[16px] font-black tracking-[-0.02em] text-[#161616] dark:text-white">
          {title}
        </h2>
        <p className="mt-1.5 max-w-[320px] text-[12px] leading-5 text-[#717171] dark:text-[#a1a1aa]">
          {description}
        </p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

export const fieldLabelClassName =
  "mb-2 block text-[11px] font-black uppercase tracking-[0.12em] text-[#5f5f5f] dark:text-[#b4b4bc]";

export const inputClassName =
  "h-11 w-full rounded-xl border border-[#dcdcdc] bg-white px-3.5 text-[13px] font-semibold text-[#171717] outline-none transition placeholder:text-[#9a9a9a] hover:border-[#c4c4c4] focus:border-[#ed1746] focus:shadow-[0_0_0_3px_rgba(237,23,70,0.1)] dark:border-[#39393d] dark:bg-[#1c1c1f] dark:text-white dark:placeholder:text-[#72727a] dark:hover:border-[#55555b] dark:focus:border-[#ed1746]";
