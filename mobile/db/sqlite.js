/**
 * SQLite database for PediScreen React Native offline queue.
 * Install: npm install react-native-sqlite-storage
 */
import SQLite from "react-native-sqlite-storage";

SQLite.DEBUG(true);
SQLite.enablePromise(true);

const DB_NAME = "pediscreen.db";
const DB_VERSION = "1.0";
const DB_DISPLAYNAME = "PediScreen DB";
const DB_SIZE = 200000;

export async function openDB() {
  const db = await SQLite.openDatabase({ name: DB_NAME, location: "default" });
  await db.executeSql(`
    CREATE TABLE IF NOT EXISTS queued_case (
      case_id TEXT PRIMARY KEY NOT NULL,
      child_age INTEGER,
      observations TEXT,
      image_path TEXT,
      embedding_b64 TEXT,
      shape TEXT,
      created_at INTEGER,
      synced INTEGER DEFAULT 0,
      attempt_count INTEGER DEFAULT 0,
      last_attempt_at INTEGER
    );
  `);
  return db;
}
