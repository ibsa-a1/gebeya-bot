export function isValidEmail(value: string): boolean {
  // Deliberately simple — good enough to catch obvious mistakes
  // (missing @, no domain) without the false-positive/negative traps
  // of a "fully RFC-compliant" regex.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
