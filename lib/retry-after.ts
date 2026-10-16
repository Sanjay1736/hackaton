// Retry-After supports seconds or an HTTP date. Invalid/missing values use a conservative default.
export function retryAfterSeconds(
  value: string | null,
  now = Date.now(),
): number {
  if (value && /^\d+$/.test(value.trim())) {
    const seconds = Number(value.trim());
    if (Number.isSafeInteger(seconds)) return Math.max(1, seconds);
  }
  if (value && !/^[+-]?\d/.test(value.trim())) {
    const date = Date.parse(value);
    if (Number.isFinite(date))
      return Math.max(1, Math.ceil((date - now) / 1000));
  }
  return 60;
}
