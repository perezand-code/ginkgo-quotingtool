type RateLimitEntry = {
  count: number;
  resetTime: number;
};
// ginkgo rate limiter 
const store = new Map<string, RateLimitEntry>();

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes stall out 
const MAX_REQUESTS = 3;

export function checkRateLimit(ip: string) {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetTime) {
    store.set(ip, {
      count: 1,
      resetTime: now + WINDOW_MS,
    });

    return { allowed: true };
  }

  if (entry.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      resetTime: entry.resetTime,
    };
  }

  entry.count += 1;
  store.set(ip, entry);

  return { allowed: true };
}
