"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

type MobileAutoHideHeaderProps = {
  children: ReactNode;
  enabled: boolean;
};

export function MobileAutoHideHeader({
  children,
  enabled,
}: MobileAutoHideHeaderProps) {
  const [isVisible, setIsVisible] = useState(true);
  const previousScrollY = useRef(0);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    previousScrollY.current = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const isNearTop = currentScrollY < 24;

      if (isNearTop || currentScrollY < previousScrollY.current) {
        setIsVisible(true);
      } else if (currentScrollY > previousScrollY.current) {
        setIsVisible(false);
      }

      previousScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, [enabled]);

  return (
    <header
      className={`shrink-0 border-b border-[#e5e5e5] bg-white px-3 py-2 transition-transform duration-300 dark:border-[#151515] dark:bg-black ${
        enabled
          ? `sticky top-0 z-40 lg:static lg:translate-y-0 ${
              isVisible ? "translate-y-0" : "-translate-y-full"
            }`
          : ""
      }`}
    >
      {children}
    </header>
  );
}
