"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "../../hooks/useAuth";

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

export function TelegramLoginButton() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { loginWithTelegram } = useAuth();

  useEffect(() => {
    window.onTelegramAuth = async (user) => {
      try {
        await loginWithTelegram(user);
        window.location.href = "/products";
      } catch (err) {
        console.error("Telegram login failed", err);
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute(
      "data-telegram-login",
      process.env.NEXT_PUBLIC_PLATFORM_AUTH_BOT_USERNAME ?? "",
    );
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "8");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    script.setAttribute("data-request-access", "write");

    containerRef.current?.appendChild(script);

    return () => {
      delete window.onTelegramAuth;
    };
  }, [loginWithTelegram]);

  return <div ref={containerRef} className="flex justify-center" />;
}
