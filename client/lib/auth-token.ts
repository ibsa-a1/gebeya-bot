let currentToken: string | null = null;
const listeners = new Set<() => void>();

export function getAccessToken() {
  return currentToken;
}

export function setAccessToken(token: string | null) {
  currentToken = token;
  listeners.forEach((l) => l());
}

export function subscribeToToken(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
