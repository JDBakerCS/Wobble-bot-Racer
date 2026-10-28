export const MAX_REQUEST_BYTES = 20_000;

const ACTIONS = new Set([
  "create",
  "join",
  "state",
  "start",
  "rematch",
  "leave",
  "react",
  "jump",
]);

export function parseGameRequest(raw) {
  if (typeof raw !== "string" || raw.length > MAX_REQUEST_BYTES) {
    throw requestError("Request too large.", 413);
  }

  let body;
  try {
    body = JSON.parse(raw);
  } catch {
    throw requestError("Request body must be valid JSON.", 400);
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw requestError("Request body must be a JSON object.", 400);
  }
  if (typeof body.action !== "string" || !ACTIONS.has(body.action)) {
    throw requestError("Unknown action.", 400);
  }

  if (["create", "join"].includes(body.action)) body.name = playerName(body.name);
  if (body.action === "create" && typeof body.solo !== "boolean") {
    throw requestError("Choose solo practice or multiplayer.", 400);
  }
  if (body.action !== "create") body.code = roomCode(body.code);
  if (!["create", "join"].includes(body.action)) {
    if (!isUuid(body.id) || !isUuid(body.token)) {
      throw requestError("Your player session has ended. Rejoin the room.", 401);
    }
  }
  if (["react", "jump"].includes(body.action)) {
    if (!Number.isInteger(body.round) || !Number.isInteger(body.hurdle)) {
      throw requestError("Invalid race position.", 400);
    }
    if (!Number.isFinite(body.at)) throw requestError("Invalid input timestamp.", 400);
  }

  return body;
}

export function requestError(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function playerName(value) {
  if (typeof value !== "string") throw requestError("Use a player name of 1–18 characters.");
  const normalized = value.trim();
  if (!normalized || [...normalized].length > 18 || /[\u0000-\u001f\u007f]/u.test(normalized)) {
    throw requestError("Use a player name of 1–18 characters.");
  }
  return normalized;
}

function roomCode(value) {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (!/^[A-Z2-9]{6}$/.test(normalized)) {
    throw requestError("Enter the six-character room code.");
  }
  return normalized;
}

function isUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
