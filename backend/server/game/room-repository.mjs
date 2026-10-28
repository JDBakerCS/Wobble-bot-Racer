export async function deleteExpiredRooms(db, now) {
  await db
    .prepare("DELETE FROM rooms WHERE code IN (SELECT code FROM rooms WHERE expires < ? LIMIT 30)")
    .bind(now)
    .run();
}

export async function insertRoom(db, room, expiresAt) {
  return db
    .prepare("INSERT OR IGNORE INTO rooms (code,state,revision,expires) VALUES (?,?,0,?)")
    .bind(room.code, JSON.stringify(room), expiresAt)
    .run();
}

export async function findRoom(db, code, now) {
  return db
    .prepare("SELECT state,revision FROM rooms WHERE code=? AND expires>?")
    .bind(code, now)
    .first();
}

export async function updateRoom(db, code, revision, room) {
  return db
    .prepare("UPDATE rooms SET state=?, revision=revision+1 WHERE code=? AND revision=?")
    .bind(JSON.stringify(room), code, revision)
    .run();
}
