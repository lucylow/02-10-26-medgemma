/**
 * Background sync for SQLite offline queue.
 * Install: npm install react-native-background-fetch @react-native-community/netinfo axios
 */
import BackgroundFetch from "react-native-background-fetch";
import NetInfo from "@react-native-community/netinfo";
import axios from "axios";
import {
  getUnsyncedCases,
  markCaseSynced,
  incrementAttempt,
} from "../storage/queue_sqlite";

const SYNC_URL = process.env.SYNC_URL || "https://yourserver.example.com/api/sync_case";
const AUTH_HEADER = process.env.AUTH_HEADER ? { Authorization: process.env.AUTH_HEADER } : {};

async function uploadCase(item) {
  try {
    const payload = {
      case_id: item.case_id,
      age_months: item.child_age,
      observations: item.observations,
      embedding_b64: item.embedding_b64,
      shape: item.shape ? item.shape.split(",").map(Number) : null,
      domain: "communication",
      meta: { source: "mobile" },
    };
    const resp = await axios.post(SYNC_URL, payload, {
      headers: AUTH_HEADER,
      timeout: 15000,
    });
    if (resp.status === 200) {
      await markCaseSynced(item.case_id);
      return true;
    } else {
      await incrementAttempt(item.case_id);
      return false;
    }
  } catch (err) {
    await incrementAttempt(item.case_id);
    return false;
  }
}

export function startBackgroundSync() {
  BackgroundFetch.configure(
    { minimumFetchInterval: 15, stopOnTerminate: false, startOnBoot: true },
    async (taskId) => {
      const state = await NetInfo.fetch();
      if (!state.isConnected) {
        BackgroundFetch.finish(taskId);
        return;
      }
      const queue = await getUnsyncedCases(20);
      for (const item of queue) {
        if (item.attempt_count > 6) continue;
        await uploadCase(item);
      }
      BackgroundFetch.finish(taskId);
    },
    (err) => console.warn("BGFetch failed", err)
  );

  NetInfo.addEventListener(async (state) => {
    if (state.isConnected) {
      const queue = await getUnsyncedCases(50);
      for (const item of queue) {
        if (item.attempt_count > 6) continue;
        uploadCase(item);
      }
    }
  });
}
