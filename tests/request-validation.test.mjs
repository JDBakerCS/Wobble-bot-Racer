import assert from "node:assert/strict";
import test from "node:test";
import { handleGameRequest } from "../backend/server/game/handler.mjs";
import { MAX_REQUEST_BYTES, parseGameRequest } from "../backend/server/game/request.mjs";

test("request validation normalizes safe create and room values", () => {
  const create = parseGameRequest(JSON.stringify({
    action: "create",
    name: "  Big Jimster  ",
    solo: true,
    robot: "opti-mist",
    track: "sunset",
  }));
  assert.equal(create.name, "Big Jimster");

  const join = parseGameRequest(JSON.stringify({
    action: "join",
    name: "Racer",
    code: "abc234",
  }));
  assert.equal(join.code, "ABC234");
});

test("request validation rejects invalid actions, sessions and control characters", () => {
  assert.throws(() => parseGameRequest('{"action":"delete"}'), /Unknown action/);
  assert.throws(
    () => parseGameRequest(JSON.stringify({ action: "join", name: "Bad\u0000Name", code: "ABC234" })),
    /player name/,
  );
  assert.throws(
    () => parseGameRequest(JSON.stringify({ action: "state", code: "ABC234", id: "no", token: "no" })),
    /session has ended/,
  );
});

test("request validation rejects malformed and oversized bodies", () => {
  assert.throws(() => parseGameRequest("not json"), /valid JSON/);
  assert.throws(() => parseGameRequest("x".repeat(MAX_REQUEST_BYTES + 1)), /too large/);
});

test("request handler rejects cross-origin calls before database access", async () => {
  const request = new Request("https://game.example/api/game", {
    method: "POST",
    headers: { origin: "https://attacker.example" },
    body: JSON.stringify({ action: "create", name: "Racer", solo: true }),
  });
  const response = await handleGameRequest(request);
  assert.equal(response.status, 403);
  assert.deepEqual(await response.json(), { error: "Request origin does not match." });
});

test("request handler reports a missing database binding without exposing internals", async () => {
  const request = new Request("https://game.example/api/game", {
    method: "POST",
    body: JSON.stringify({ action: "create", name: "Racer", solo: true }),
  });
  const response = await handleGameRequest(request);
  assert.equal(response.status, 503);
  assert.deepEqual(await response.json(), { error: "The race server is not configured." });
});

test("request handler does not expose unexpected database errors", async () => {
  const request = new Request("https://game.example/api/game", {
    method: "POST",
    body: JSON.stringify({
      action: "create",
      name: "Racer",
      solo: true,
      robot: "optimus",
      track: "sunset",
    }),
  });
  const db = { prepare() { throw new Error("private database details"); } };
  const originalError = console.error;
  console.error = () => {};
  try {
    const response = await handleGameRequest(request, db);
    assert.equal(response.status, 500);
    assert.deepEqual(await response.json(), {
      error: "The race server could not complete the request.",
    });
  } finally {
    console.error = originalError;
  }
});
