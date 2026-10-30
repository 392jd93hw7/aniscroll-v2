import test from "node:test"
import assert from "node:assert/strict"
import { createRateLimiter } from "../server/security.js"

function mockResponse() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    set(name, value) { this.headers[name] = value; return this },
    status(code) { this.statusCode = code; return this },
    json(body) { this.body = body; return this },
  }
}

test("rate limiter permits requests within the configured window", () => {
  let now = 1_000
  const limit = createRateLimiter({ windowMs: 10_000, max: 2, now: () => now })
  let nextCalls = 0
  for (let i = 0; i < 2; i += 1) {
    const response = mockResponse()
    limit({ ip: "client-a" }, response, () => { nextCalls += 1 })
    assert.equal(response.statusCode, 200)
  }
  assert.equal(nextCalls, 2)
  assert.equal(mockResponse().statusCode, 200)
  now += 10_001
  const response = mockResponse()
  limit({ ip: "client-a" }, response, () => { nextCalls += 1 })
  assert.equal(response.statusCode, 200)
  assert.equal(nextCalls, 3)
})

test("rate limiter blocks excess requests and supplies Retry-After", () => {
  const limit = createRateLimiter({ windowMs: 60_000, max: 1, now: () => 20_000 })
  let nextCalls = 0
  const first = mockResponse()
  limit({ ip: "client-a" }, first, () => { nextCalls += 1 })
  const blocked = mockResponse()
  limit({ ip: "client-a" }, blocked, () => { nextCalls += 1 })
  assert.equal(blocked.statusCode, 429)
  assert.equal(blocked.headers["Retry-After"], "60")
  assert.equal(blocked.body.retryAfterSeconds, 60)
  assert.equal(nextCalls, 1)
})

test("rate limits are isolated per client", () => {
  const limit = createRateLimiter({ max: 1, now: () => 10_000 })
  const a = mockResponse()
  const b = mockResponse()
  limit({ ip: "client-a" }, a, () => {})
  limit({ ip: "client-b" }, b, () => {})
  assert.equal(a.statusCode, 200)
  assert.equal(b.statusCode, 200)
})
