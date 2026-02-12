/**
 * CRUD helpers for SQLite offline queue.
 * Install: npm install uuid
 */
import { openDB } from "../db/sqlite";
import { v4 as uuidv4 } from "uuid";

export async function queueCase({
  childAgeMonths,
  observations,
  imagePath = null,
  embeddingB64 = null,
  shape = null,
}) {
  const db = await openDB();
  const caseId = uuidv4();
  const createdAt = Date.now();
  const shapeStr = shape ? shape.join(",") : null;
  await db.executeSql(
    `INSERT INTO queued_case (case_id, child_age, observations, image_path, embedding_b64, shape, created_at, synced) VALUES (?, ?, ?, ?, ?, ?, ?, 0)`,
    [caseId, childAgeMonths, observations, imagePath, embeddingB64, shapeStr, createdAt]
  );
  return caseId;
}

export async function getUnsyncedCases(limit = 10) {
  const db = await openDB();
  const [res] = await db.executeSql(
    `SELECT * FROM queued_case WHERE synced=0 ORDER BY created_at LIMIT ?`,
    [limit]
  );
  const rows = [];
  for (let i = 0; i < res.rows.length; i++) {
    rows.push(res.rows.item(i));
  }
  return rows;
}

export async function markCaseSynced(caseId) {
  const db = await openDB();
  await db.executeSql(
    `UPDATE queued_case SET synced=1, last_attempt_at=?, attempt_count=attempt_count+1 WHERE case_id=?`,
    [Date.now(), caseId]
  );
}

export async function incrementAttempt(caseId) {
  const db = await openDB();
  await db.executeSql(
    `UPDATE queued_case SET attempt_count = attempt_count + 1, last_attempt_at = ? WHERE case_id = ?`,
    [Date.now(), caseId]
  );
}
