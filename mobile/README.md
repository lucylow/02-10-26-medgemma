# PediScreen Mobile – React Native Offline Queue (SQLite)

Reference implementation for offline-first screening on React Native using SQLite.

## Install

```bash
npm install react-native-sqlite-storage uuid react-native-background-fetch @react-native-community/netinfo axios react-native-image-picker react-native-fs
cd ios && pod install
```

## Files

- `db/sqlite.js` – Open DB and schema
- `storage/queue_sqlite.js` – CRUD for queued cases
- `sync/sync_sqlite.js` – Background sync with NetInfo + backoff
- `compute/computeEmbeddingLocalServer.js` – Call local embed server
- `components/ScreeningFormSQLite.js` – Form component

## Usage

1. Call `startBackgroundSync()` from your app entry (e.g. `App.js`).
2. Set `SYNC_URL` and `AUTH_HEADER` (or `EMBED_SERVER_URL`) via env.
3. Use `ScreeningFormSQLite` or integrate queue/sync into your screens.

## Notes

- Use `react-native-sqlite-storage` promise mode.
- Background fetch on iOS is limited; rely on NetInfo for near-real-time sync.
- Keep `embedding_b64` sized reasonably (~1KB for 256-dim, ~4KB for 1024-dim).
