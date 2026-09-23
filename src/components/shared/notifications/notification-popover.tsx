import {
  NotificationItem,
  type NotificationItemData,
} from "@/components/shared/notifications/notification-item";

type NotificationPopoverProps = {
  id: string;
  items: NotificationItemData[];
  onClose: () => void;
};

export function NotificationPopover({
  id,
  items,
  onClose,
}: NotificationPopoverProps) {
  return (
    <div
      id={id}
      role="dialog"
      aria-label="Notifications"
      className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-[#dedede] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.2)] dark:border-[#38383c] dark:bg-[#1d1d20]"
    >
      <div className="flex items-center justify-between border-b border-[#ececec] px-4 py-3.5 dark:border-[#343438]">
        <div>
          <p className="text-[14px] font-black tracking-[-0.02em] text-[#171717] dark:text-white">
            Notifications
          </p>
          <p className="mt-0.5 text-[10px] text-[#858585] dark:text-[#92929a]">
            Events and band activity
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close notifications"
          className="flex size-8 items-center justify-center rounded-full text-[#777] transition hover:bg-[#f2f2f2] hover:text-[#111] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:text-[#a1a1aa] dark:hover:bg-[#2c2c30] dark:hover:text-white"
        >
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="size-4"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="m6 6 12 12M18 6 6 18" />
          </svg>
        </button>
      </div>

      {items.length > 0 ? (
        <div className="max-h-[min(420px,60vh)] overflow-y-auto p-2">
          {items.map((item) => (
            <NotificationItem key={item.id} item={item} onSelect={onClose} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center px-6 py-9 text-center">
          <span className="flex size-12 items-center justify-center rounded-full bg-[#fff0f3] text-[#ed1746] dark:bg-[#3a111d] dark:text-[#fb7185]">
            <svg
              aria-hidden="true"
              viewBox="0 0 24 24"
              fill="none"
              className="size-6"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
              <path d="M10 21h4" />
            </svg>
          </span>
          <p className="mt-3 text-[13px] font-black text-[#171717] dark:text-white">
            You&apos;re all caught up
          </p>
          <p className="mt-1 max-w-[240px] text-[11px] leading-4 text-[#777] dark:text-[#92929a]">
            Band invitations, event reminders, and important updates will appear here.
          </p>
        </div>
      )}
    </div>
  );
}
