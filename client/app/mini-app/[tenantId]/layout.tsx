import Script from "next/script";
import { CartProvider } from "../../../hooks/useCart";

export default function MiniAppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-canvas">
      <Script src="https://telegram.org/js/telegram-web-app.js" strategy="beforeInteractive" />
      <CartProvider>{children}</CartProvider>
    </div>
  );
}
