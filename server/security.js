export function createRateLimiter(options = {}) {
  const windowMs = Math.max(1000, Number(options.windowMs) || 60_000)
  const max = Math.max(1, Number(options.max) || 120)
  const now = options.now || Date.now
  const keyGenerator = options.keyGenerator || ((req) => req.ip || req.socket?.remoteAddress || "unknown")
  const clients = new Map()
  let requestsSinceSweep = 0

  return function rateLimit(req, res, next) {
    const timestamp = now()
    const key = String(keyGenerator(req) || "unknown")
    let entry = clients.get(key)
    if (!entry || timestamp - entry.startedAt >= windowMs) {
      entry = { startedAt: timestamp, count: 0 }
      clients.set(key, entry)
    }

    entry.count += 1
    requestsSinceSweep += 1
    if (requestsSinceSweep >= 500 || clients.size > 10_000) {
      for (const [clientKey, client] of clients) {
        if (timestamp - client.startedAt >= windowMs) clients.delete(clientKey)
      }
      requestsSinceSweep = 0
    }

    res.set("RateLimit-Limit", String(max))
    res.set("RateLimit-Remaining", String(Math.max(0, max - entry.count)))
    res.set("RateLimit-Reset", String(Math.ceil((entry.startedAt + windowMs) / 1000)))

    if (entry.count > max) {
      const retryAfter = Math.max(1, Math.ceil((entry.startedAt + windowMs - timestamp) / 1000))
      res.set("Retry-After", String(retryAfter))
      return res.status(429).json({
        error: "Too many requests. Please wait before trying again.",
        retryAfterSeconds: retryAfter,
      })
    }

    return next()
  }
}
