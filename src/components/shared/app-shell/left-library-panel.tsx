"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { LogoutButton } from "@/components/shared/logout-button";

type AppMenuContextValue = {
  closeMenu: () => void;
  isOpen: boolean;
  openMenu: () => void;
};

type MenuItem = {
  activePrefixes?: string[];
  href?: string;
  icon: MenuIconName;
  label: string;
  note?: string;
};

type MenuIconName =
  | "home"
  | "browse"
  | "tracks"
  | "setlists"
  | "bands"
  | "events"
  | "chords";

const AppMenuContext = createContext<AppMenuContextValue | null>(null);

const MENU_ITEMS: MenuItem[] = [
  { href: "/", icon: "home", label: "Home" },
  { href: "/browse", icon: "browse", label: "Browse" },
  {
    activePrefixes: ["/track", "/music"],
    href: "/annotation",
    icon: "tracks",
    label: "Track library",
  },
  { href: "/setlists", icon: "setlists", label: "Setlists" },
  { href: "/bands", icon: "bands", label: "Bands" },
  { href: "/events", icon: "events", label: "Events" },
  { href: "/chord-chart", icon: "chords", label: "Chord chart" },
];

export function AppMenuProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = useCallback(() => {
    setIsOpen(false);
    window.requestAnimationFrame(() =>
      document.getElementById("app-menu-trigger")?.focus(),
    );
  }, []);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.getElementById("app-menu-close")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closeMenu();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeMenu, isOpen]);

  return (
    <AppMenuContext.Provider
      value={{
        closeMenu,
        isOpen,
        openMenu: () => setIsOpen(true),
      }}
    >
      {children}
    </AppMenuContext.Provider>
  );
}

export function MobileMenuButton() {
  const menu = useAppMenu();

  return (
    <button
      id="app-menu-trigger"
      type="button"
      aria-label="Open menu"
      aria-expanded={menu.isOpen}
      aria-controls="mobile-app-menu"
      onClick={menu.openMenu}
      className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#ededed] text-[#111] transition hover:bg-[#e2e2e2] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] lg:hidden dark:bg-[#1f1f1f] dark:text-white dark:hover:bg-[#2a2a2a]"
    >
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="size-5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      >
        <path d="M4 7h16M4 12h16M4 17h16" />
      </svg>
    </button>
  );
}

export function LeftLibraryPanel({
  isAuthenticated = false,
  showDesktop = true,
}: {
  isAuthenticated?: boolean;
  showDesktop?: boolean;
}) {
  const menu = useAppMenu();

  return (
    <>
      <aside
        className={
          showDesktop
            ? "hidden min-h-0 flex-col rounded-xl bg-white p-4 dark:bg-[#121214] lg:flex"
            : "hidden"
        }
      >
        <MenuHeading />
        <MenuContent isAuthenticated={isAuthenticated} />
      </aside>

      <div
        className={`fixed inset-0 z-50 transition lg:hidden ${
          menu.isOpen ? "pointer-events-auto" : "pointer-events-none"
        }`}
        aria-hidden={!menu.isOpen}
      >
        <button
          type="button"
          tabIndex={menu.isOpen ? 0 : -1}
          aria-label="Close menu"
          onClick={menu.closeMenu}
          className={`absolute inset-0 bg-black/65 transition-opacity duration-200 focus-visible:outline-2 focus-visible:outline-inset focus-visible:outline-[#ed1746] ${
            menu.isOpen ? "opacity-100" : "opacity-0"
          }`}
        />
        <aside
          id="mobile-app-menu"
          role="dialog"
          aria-modal="true"
          aria-labelledby="mobile-app-menu-title"
          inert={!menu.isOpen}
          className={`absolute inset-y-0 left-0 flex w-[min(86vw,340px)] flex-col border-r border-[#e4e4e4] bg-white shadow-2xl transition-transform duration-200 ease-out dark:border-[#303034] dark:bg-[#121214] ${
            menu.isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex items-center justify-between border-b border-[#e8e8e8] px-5 py-4 dark:border-[#29292d]">
            <div id="mobile-app-menu-title">
              <MenuHeading />
            </div>
            <button
              id="app-menu-close"
              type="button"
              onClick={menu.closeMenu}
              aria-label="Close menu"
              className="flex size-10 items-center justify-center rounded-full bg-[#f1f1f1] text-xl font-medium transition hover:bg-[#e5e5e5] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] dark:bg-[#242428] dark:hover:bg-[#303034]"
            >
              ×
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <MenuContent
              isAuthenticated={isAuthenticated}
              onNavigate={menu.closeMenu}
            />
          </div>
        </aside>
      </div>
    </>
  );
}

function MenuHeading() {
  return (
    <div className="flex items-center gap-2 text-[15px] font-bold">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        className="size-5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      >
        <path d="M5 6h14M5 12h14M5 18h14" />
      </svg>
      Menu
    </div>
  );
}

function MenuContent({
  isAuthenticated,
  onNavigate,
}: {
  isAuthenticated: boolean;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <nav aria-label="Main navigation" className="mt-6 grid gap-2">
        {MENU_ITEMS.map((item) => {
          const isActive = item.href
            ? isActivePath(pathname, item.href, item.activePrefixes)
            : false;
          const content = (
            <>
              <span
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${
                  isActive
                    ? "bg-[#ed1746] text-white"
                    : "bg-[#f1f1f1] text-[#555] dark:bg-[#242428] dark:text-[#d4d4d8]"
                }`}
              >
                <MenuIcon name={item.icon} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-bold">
                  {item.label}
                </span>
                {item.note ? (
                  <span className="mt-0.5 block text-[10px] text-[#777] dark:text-[#a1a1aa]">
                    {item.note}
                  </span>
                ) : null}
              </span>
            </>
          );

          if (!item.href) {
            return (
              <div
                key={item.label}
                aria-disabled="true"
                className="flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 opacity-65"
              >
                {content}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={onNavigate}
              className={`flex min-w-0 items-center gap-3 rounded-xl px-2 py-2 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#ed1746] ${
                isActive
                  ? "bg-[#fff0f3] text-[#c90f39] dark:bg-[#3a111d] dark:text-[#fb7185]"
                  : "hover:bg-[#f5f5f5] dark:hover:bg-[#1f1f22]"
              }`}
            >
              {content}
            </Link>
          );
        })}
      </nav>
      {isAuthenticated ? (
        <div className="mt-auto border-t border-[#e8e8e8] pt-4 dark:border-[#29292d]">
          <LogoutButton variant="menu" />
        </div>
      ) : null}
    </div>
  );
}

function MenuIcon({ name }: { name: MenuIconName }) {
  const paths: Record<MenuIconName, ReactNode> = {
    home: <><path d="m4 11 8-7 8 7" /><path d="M6 10v10h12V10M10 20v-6h4v6" /></>,
    browse: <><circle cx="11" cy="11" r="6" /><path d="m16 16 4 4" /></>,
    tracks: <><path d="M8 5v14M16 3v14" /><path d="M8 8l8-2" /><circle cx="5.5" cy="19" r="2.5" /><circle cx="13.5" cy="17" r="2.5" /></>,
    setlists: <><path d="M9 6h11M9 12h11M9 18h11" /><path d="m4 6 .8.8L6.5 5M4 12l.8.8L6.5 11M4 18l.8.8L6.5 17" /></>,
    bands: <><circle cx="8" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c.4-4 2-6 5-6s4.6 2 5 6M14 15c3.5-.8 6 .8 7 4" /></>,
    events: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M8 14h3M13 14h3M8 17h3" /></>,
    chords: <><path d="M5 4v16M10 4v16M15 4v16M20 4v16" /><path d="M5 8h15M5 13h15M5 18h15" /><circle cx="10" cy="8" r="1.5" fill="currentColor" stroke="none" /><circle cx="15" cy="13" r="1.5" fill="currentColor" stroke="none" /></>,
  };

  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      className="size-5"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[name]}
    </svg>
  );
}

function isActivePath(
  pathname: string,
  href: string,
  activePrefixes: string[] = [],
): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return (
    pathname === href ||
    pathname.startsWith(`${href}/`) ||
    activePrefixes.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  );
}

function useAppMenu(): AppMenuContextValue {
  const menu = useContext(AppMenuContext);

  if (!menu) {
    throw new Error("App menu components must be rendered inside AppMenuProvider.");
  }

  return menu;
}
