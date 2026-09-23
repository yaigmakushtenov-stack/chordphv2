import Link from "next/link";

export type NotificationItemData = {
  description: string;
  href?: string;
  id: string;
  isRead: boolean;
  timeLabel: string;
  title: string;
};

type NotificationItemProps = {
  item: NotificationItemData;
  onSelect: () => void;
};

export function NotificationItem({ item, onSelect }: NotificationItemProps) {
  const content = (
    <>
      <span
        aria-hidden="true"
        className={`mt-1.5 size-2 shrink-0 rounded-full ${
          item.isRead ? "bg-[#d4d4d4] dark:bg-[#52525b]" : "bg-[#ed1746]"
        }`}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[12px] font-black text-[#171717] dark:text-white">
          {item.title}
        </span>
        <span className="mt-1 block text-[11px] leading-4 text-[#6f6f6f] dark:text-[#a1a1aa]">
          {item.description}
        </span>
        <span className="mt-1.5 block text-[10px] font-semibold text-[#969696] dark:text-[#71717a]">
          {item.timeLabel}
        </span>
      </span>
    </>
  );

  if (item.href) {
    return (
      <Link
        href={item.href}
        onClick={onSelect}
        className="flex gap-3 rounded-xl px-3 py-3 transition hover:bg-[#f6f6f6] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:hover:bg-[#26262a]"
      >
        {content}
      </Link>
    );
  }

  return <div className="flex gap-3 px-3 py-3">{content}</div>;
}
