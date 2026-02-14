/**
 * Offline-first queue using IndexedDB.
 * Never block care because the model is unavailable.
 * Enables deferred upload when back online — critical for CHWs, rural settings, LMICs.
 */
import { openDB, DBSchema, IDBPDatabase } from "idb";

export interface QueuedScreening {
  id: string;
  type: "medgemma_draft";
  payload: {
    childAge: string;
    domain: string;
    observations: string;
    imagePreview?: string | null;
    imageFile?: { name: string; base64?: string } | null;
  };
  queuedAt: number;
}

interface PediScreenDB extends DBSchema {
  queue: {
    key: number;
    value: {
      id: number;
      type: string;
      payload: QueuedScreening["payload"];
      queuedAt: number;
    };
    indexes: { "by-ts": number };
  };
}

const DB_NAME = "pediscreen-offline";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PediScreenDB>> | null = null;

function getDB() {
  if (!dbPromise) {
    dbPromise = openDB<PediScreenDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore("queue", {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("by-ts", "queuedAt");
      },
    });
  }
  return dbPromise;
}

export async function enqueue(
  screening: Omit<QueuedScreening, "id" | "queuedAt">
): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("queue", "readwrite");
  const store = tx.objectStore("queue");
  await store.add({
    id: 0 as unknown as number,
    type: screening.type,
    payload: screening.payload,
    queuedAt: Date.now(),
  });
  await tx.done;
}

export function enqueueSync(screening: Omit<QueuedScreening, "id" | "queuedAt">): void {
  enqueue(screening).catch((e) => console.warn("Offline enqueue failed:", e));
}

export async function flush(
  sendFn: (payload: QueuedScreening["payload"]) => Promise<void>
): Promise<number> {
  const db = await getDB();
  const tx = db.transaction("queue", "readwrite");
  const store = tx.objectStore("queue");
  const index = store.index("by-ts");
  let cursor = await index.openCursor();
  let count = 0;

  while (cursor) {
    try {
      await sendFn(cursor.value.payload);
      await store.delete(cursor.primaryKey);
      count++;
    } catch (e) {
      console.warn("Offline queue flush failed for item:", e);
      break;
    }
    cursor = await cursor.continue();
  }
  await tx.done;
  return count;
}

export async function getQueueStatus(): Promise<QueuedScreening[]> {
  const db = await getDB();
  const all = await db.getAllFromIndex("queue", "by-ts");
  return all.map((row, i) => ({
    id: `offline_${row.queuedAt}_${i}`,
    type: row.type as "medgemma_draft",
    payload: row.payload,
    queuedAt: row.queuedAt,
  }));
}

export async function getQueueLength(): Promise<number> {
  const db = await getDB();
  return db.count("queue");
}

export function dequeue(_id: string): QueuedScreening | null {
  return null;
}

export async function clearQueue(): Promise<void> {
  const db = await getDB();
  const tx = db.transaction("queue", "readwrite");
  await tx.objectStore("queue").clear();
  await tx.done;
}

/** Convert data URL (base64) to File for upload. */
export function dataURLToFile(dataUrl: string, filename: string): File {
  const arr = dataUrl.split(",");
  const mimeMatch = arr[0].match(/:(.*?);/);
  const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
  const bstr = atob(arr[1] || "");
  const u8arr = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8arr[i] = bstr.charCodeAt(i);
  return new File([u8arr], filename, { type: mime });
}
