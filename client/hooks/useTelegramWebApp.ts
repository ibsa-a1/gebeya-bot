"use client";

import { useEffect, useState } from "react";

interface TelegramUser {
  id: number;
  first_name: string;
  username?: string;
}

interface TelegramWebApp {
  initData: string;
  initDataUnsafe: { user?: TelegramUser };
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
}

declare global {
  interface Window {
    Telegram?: { WebApp: TelegramWebApp };
  }
}

// Returns null outside a real Telegram session (e.g. a plain browser tab
// during development) — every caller must handle that case explicitly
// rather than assuming Telegram is always present.
export function useTelegramWebApp() {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Telegram?.WebApp?.initDataUnsafe) {
      const wa = window.Telegram.WebApp;
      wa.ready();
      wa.expand();
      setWebApp(wa);
    }
  }, []);

  return webApp;
}
