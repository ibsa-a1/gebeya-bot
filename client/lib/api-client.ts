import axios from "axios";
import { getAccessToken, setAccessToken } from "./auth-token";

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL,
  withCredentials: true, // send the HttpOnly refresh cookie
  headers: {
    // Free ngrok tunnels serve an HTML "visit site" interstitial warning page
    // to the first browser request instead of proxying through to the real
    // API — which has no CORS headers and causes a misleading CORS error in
    // the browser console. This header tells ngrok to skip that page.
    // Only relevant when NEXT_PUBLIC_API_BASE_URL points at an ngrok tunnel
    // (local dev testing from Telegram's Mini App); harmless in production.
    "ngrok-skip-browser-warning": "true",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = apiClient
      .post("/auth/refresh")
      .then((res) => {
        const token = res.data?.accessToken ?? null;
        setAccessToken(token);
        return token;
      })
      .catch(() => {
        setAccessToken(null);
        return null;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retried) {
      original._retried = true;
      const newToken = await refreshAccessToken();
      if (newToken) {
        original.headers.Authorization = `Bearer ${newToken}`;
        return apiClient(original);
      }
    }
    return Promise.reject(error);
  },
);

export { refreshAccessToken };
