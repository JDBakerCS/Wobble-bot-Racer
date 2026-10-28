import { validateTrack } from "../../../shared/tracks.mjs";
import { act, advance, player, view } from "../../../shared/game.mjs";
import { MAX_REQUEST_BYTES, parseGameRequest, requestError } from "./request.mjs";
import { deleteExpiredRooms, findRoom, insertRoom, updateRoom } from "./room-repository.mjs";

const ROOM_LIFETIME_MS = 6 * 60 * 60 * 1000;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function handleGameRequest(request, db) {
  try {
    assertSameOrigin(request);
    if (!db) throw requestError("The race server is not configured.", 503);

    const raw = await request.text();
    if (raw.length > MAX_REQUEST_BYTES) throw requestError("Request too large.", 413);
    const body = parseGameRequest(raw);
    const now = Date.now();

    if (body.action === "create") return await createRoom(db, body, now);
    return await handleExistingRoom(db, body, now);
  } catch (error) {
    if (Number.isInteger(error?.status)) return json({ error: error.message }, error.status);
    console.error("Game request failed", error);
    return json({ error: "The race server could not complete the request." }, 500);
  }
}

async function createRoom(db, body, now) {
  let newPlayer;
  let track;
  try {
    newPlayer = player(body.name, body.robot);
    track = validateTrack(body.track);
  } catch (error) {
    throw requestError(error instanceof Error ? error.message : "Invalid racer settings.");
  }
  await deleteExpiredRooms(db, now);

  for (let attempt = 0; attempt < 4; attempt++) {
    const code = randomCode();
    const room = {
      code,
      version: 4,
      track,
      solo: body.solo,
      phase: "lobby",
      round: 0,
      until: 0,
      players: [newPlayer],
      winners: [],
    };
    const result = await insertRoom(db, room, now + ROOM_LIFETIME_MS);
    if (result.meta.changes) {
      return json({
        room: view(room, newPlayer.id, now),
        session: { code, id: newPlayer.id, token: newPlayer.token },
      });
    }
  }
  throw requestError("Could not create a room. Please retry.", 503);
}

async function handleExistingRoom(db, body, now) {
  for (let retry = 0; retry < 8; retry++) {
    const row = await findRoom(db, body.code, now);
    if (!row) throw requestError("Room not found or expired. Check your code.", 404);

    const room = storedRoom(row.state);
    if (room.version !== 4) {
      throw requestError("The individual-hurdles update is here. Leave this old room and create a new one.", 409);
    }

    let currentPlayer = room.players.find(
      (candidate) => candidate.id === body.id && candidate.token === body.token,
    );
    let session;
    if (body.action !== "join" && !currentPlayer) {
      throw requestError("Your player session has ended. Rejoin the room.", 401);
    }

    let changed = advance(room, now);
    if (body.action === "join") {
      if (!currentPlayer) {
        if (room.solo) throw requestError("This is solo practice. Create a multiplayer room to race together.", 409);
        if (!["lobby", "finished"].includes(room.phase)) throw requestError("This race has started. Join after the finish.", 409);
        if (room.players.length >= 4) throw requestError("This room has four players already.", 409);
        currentPlayer = player(body.name, body.robot);
        room.players.push(currentPlayer);
        changed = true;
      }
      session = { code: body.code, id: currentPlayer.id, token: currentPlayer.token };
    } else if (body.action !== "state") {
      try {
        act(room, currentPlayer, body, now);
      } catch (error) {
        throw requestError(error instanceof Error ? error.message : "Invalid game action.");
      }
      changed = true;
    }

    if (changed) {
      const result = await updateRoom(db, body.code, row.revision, room);
      if (!result.meta.changes) continue;
    }
    return json({ room: view(room, currentPlayer.id, now), ...(session ? { session } : {}) });
  }
  throw requestError("The room is busy. Try again.", 409);
}

function storedRoom(value) {
  let room;
  try {
    room = JSON.parse(value);
  } catch {
    throw requestError("The room data is unavailable. Create a new room.", 500);
  }
  if (!room || typeof room !== "object" || !Array.isArray(room.players)) {
    throw requestError("The room data is unavailable. Create a new room.", 500);
  }
  return room;
}

function assertSameOrigin(request) {
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) {
    throw requestError("Request origin does not match.", 403);
  }
}

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return Array.from(bytes, (value) => CODE_ALPHABET[value % CODE_ALPHABET.length]).join("");
}

function json(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
