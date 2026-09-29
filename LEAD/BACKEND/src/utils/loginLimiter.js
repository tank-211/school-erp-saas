/**
 * src/utils/loginLimiter.js
 *
 * Limits password guessing on login routes, in memory (per server instance).
 * Same logic in ADMISSION, FEES and SUPER-ADMIN; keep the copies in step.
 *
 * - Counts FAILED attempts (4xx responses) for the same IP + email, and for
 *   the IP overall. A successful login clears that IP + email count, so a
 *   user who mistypes a few times is not punished after getting it right.
 * - Server errors (5xx) are not counted: they are not the user's fault.
 * - countAll: count every attempt, successful or not (for sign-up routes).
 * - When a limit is reached the route answers 429 with a Retry-After header,
 *   without running the login handler.
 *
 * Needs app.set('trust proxy', 1) behind Render/Vercel so req.ip is the
 * visitor's address rather than the proxy's.
 */
const WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_KEYS = 50_000;

export const createLoginLimiter = ({
  windowMs = WINDOW_MS,
  maxPerAccount = 10,
  maxPerIp = 50,
  accountField = 'email',
  countAll = false,
  message = 'Too many login attempts. Please wait a few minutes and try again.',
} = {}) => {
  const hits = new Map(); // key -> { count, resetAt }

  const prune = (now) => {
    if (hits.size < MAX_TRACKED_KEYS) return;
    for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
  };
  const current = (key, now) => {
    const entry = hits.get(key);
    if (!entry || entry.resetAt <= now) return null;
    return entry;
  };
  const bump = (key, now) => {
    const entry = current(key, now);
    if (entry) entry.count += 1;
    else hits.set(key, { count: 1, resetAt: now + windowMs });
  };

  const limiter = (req, res, next) => {
    const now = Date.now();
    prune(now);
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
    const account = String(req.body?.[accountField] ?? '').trim().toLowerCase();
    const keys = [[`ip:${ip}`, maxPerIp]];
    if (account) keys.push([`account:${ip}:${account}`, maxPerAccount]);

    for (const [key, max] of keys) {
      const entry = current(key, now);
      if (entry && entry.count >= max) {
        const retryAfter = Math.max(Math.ceil((entry.resetAt - now) / 1000), 1);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
          success: false,
          code: 'TOO_MANY_ATTEMPTS',
          message,
          error: message,
          retry_after_seconds: retryAfter,
        });
      }
    }

    res.on('finish', () => {
      const status = res.statusCode;
      const failed = status >= 400 && status < 500 && status !== 429;
      const at = Date.now();
      if (countAll || failed) {
        keys.forEach(([key]) => bump(key, at));
      } else if (status < 400 && account) {
        hits.delete(`account:${ip}:${account}`);
      }
    });
    next();
  };

  limiter.reset = () => hits.clear(); // for tests
  return limiter;
};
