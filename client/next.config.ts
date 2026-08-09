import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Allows the Telegram Mini App (served through the cloudflared tunnel) to
  // connect to Next.js dev's Hot Module Reload websocket. Without this,
  // Next.js silently blocks the HMR connection from any origin other than
  // localhost, which manifests as the page appearing stuck/blank in dev mode
  // even though the initial page load itself succeeds.
  // NOTE: this tunnel domain rotates on every cloudflared restart — update
  // this value whenever that happens.
  allowedDevOrigins: ["hwy-warm-rear-edt.trycloudflare.com"],
};

export default nextConfig;
