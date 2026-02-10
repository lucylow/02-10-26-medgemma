# Offline-First Playbook: PediScreen AI

This playbook provides practical patterns and technical options for handling limited or intermittent internet access for PediScreen AI.

## 1. Deployment Strategy

- **Primary: On-device inference (offline-first)**. Run a quantized/distilled MedGemma/MedSigLIP pipeline (or a small local fallback model) entirely on the device so the app works without the network. Best for privacy & reliability.
- **Backup: Store-and-forward / hybrid**. Compute embeddings on-device (cheap) and upload them (or full inputs) when connectivity returns. If device can’t run the model, run a tiny on-device heuristic and queue requests for cloud inference later.
- **Alternate fallback: SMS/USSD/phone-assisted flow**. For extremely constrained regions, allow caregivers or CHWs to submit minimal reports via SMS or call a local health worker who uses your web interface.

## 2. Offline-First Architecture

- **UI + Local DB**: SQLite, Realm, or WatermelonDB.
- **Local Inference Engine**: If possible, or a local lightweight classifier.
- **Queue**: Persistent upload queue for results / telemetry / logs.
- **Sync Service**: Secure background sync when online, with conflict resolution.
- **Server Side**: Idempotent endpoints (`/api/sync_case`) that accept batched uploads and return results.

## 3. Practical On-Device Options & Tradeoffs

### Model Size Choices
- Full MedGemma (2B) → may be feasible with aggressive quantization and on modern high-end devices, but test carefully.
- Distill to a smaller specialist model (e.g., 100–500M) or use adapter-only inference (load base offline + adapters) if hardware allows.

### Quantization & Conversion Targets
- **PyTorch Mobile**: Good for Android / iOS (torchscript).
- **ONNX → ONNX Runtime Mobile**: Convert with `torch.onnx.export`, then optimize with ONNX Runtime for mobile.
- **TensorFlow Lite (TFLite)**: Convert ONNX to TensorFlow (if needed) then `tflite_convert` with full/integer quantization.
- **Edge inference libraries**: NNAPI (Android), CoreML (iOS) — convert appropriately.

### Performance Testing
Measure latency, memory, and battery for each target device. If the app is too slow, fallback to hybrid mode.

## 4. Code Snippets

### A. Precompute embeddings on-device (Python Pseudocode)

```python
import sqlite3
import base64
import json
from time import time
import requests

# local DB (initialize once)
conn = sqlite3.connect("pediscreen_local.db")
c = conn.cursor()
c.execute("""
CREATE TABLE IF NOT EXISTS upload_queue(
  id TEXT PRIMARY KEY,
  created_ts INTEGER,
  payload TEXT,
  synced INTEGER DEFAULT 0
)
""")
conn.commit()

def queue_embedding(embedding_vector, metadata):
    # embedding_vector: numpy array
    payload = {
        "embedding_b64": base64.b64encode(embedding_vector.tobytes()).decode(),
        "shape": list(embedding_vector.shape),
        "meta": metadata
    }
    id = metadata["case_id"]
    c.execute("INSERT OR REPLACE INTO upload_queue (id, created_ts, payload, synced) VALUES (?, ?, ?, ?)",
              (id, int(time()), json.dumps(payload), 0))
    conn.commit()

def sync_queue(server_url, auth_token):
    rows = c.execute("SELECT id, payload FROM upload_queue WHERE synced=0").fetchall()
    for rid, payload_str in rows:
        payload = json.loads(payload_str)
        # Transform payload for PediScreen API
        api_payload = {
            "case_id": payload["meta"]["case_id"],
            "age_months": payload["meta"]["age"],
            "observations": payload["meta"]["obs"],
            "embedding_b64": payload["embedding_b64"],
            "shape": payload["shape"]
        }
        resp = requests.post(server_url + "/api/sync_case", json=api_payload, headers={"Authorization": f"Bearer {auth_token}"}, timeout=10)
        if resp.status_code == 200:
            c.execute("UPDATE upload_queue SET synced=1 WHERE id=?", (rid,))
            conn.commit()
```

### B. React Native Offline-First Flow

```javascript
import React, { useState, useEffect } from 'react';
import { View, Button, Text } from 'react-native';
import NetInfo from "@react-native-community/netinfo";
import Realm from 'realm';
import axios from 'axios';

// Define Schema
const CaseSchema = {
  name: 'Case',
  primaryKey: 'id',
  properties: {
    id: 'string',
    age_months: 'int',
    observations: 'string',
    embedding_b64: 'string',
    shape: 'int[]',
    synced: { type: 'bool', default: false },
    created_at: 'date'
  }
};

const OfflineSyncComponent = () => {
  const [isConnected, setIsConnected] = useState(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
      if (state.isConnected) {
        syncData();
      }
    });
    return () => unsubscribe();
  }, []);

  const syncData = async () => {
    const realm = await Realm.open({ schema: [CaseSchema] });
    const unsyncedCases = realm.objects('Case').filtered('synced == false');
    
    for (let caseObj of unsyncedCases) {
      try {
        const response = await axios.post('https://api.pediscreen.ai/api/sync_case', {
          case_id: caseObj.id,
          age_months: caseObj.age_months,
          observations: caseObj.observations,
          embedding_b64: caseObj.embedding_b64,
          shape: Array.from(caseObj.shape)
        });
        
        if (response.status === 200) {
          realm.write(() => {
            caseObj.synced = true;
          });
        }
      } catch (error) {
        console.error("Sync failed for case:", caseObj.id, error);
      }
    }
  };

  return (
    <View>
      <Text>Status: {isConnected ? 'Online' : 'Offline'}</Text>
      <Button title="Manual Sync" onPress={syncData} disabled={!isConnected} />
    </View>
  );
};
```

## 5. UX & Product Rules

- **Show Connectivity State**: Online / Offline / Syncing.
- **Graceful Degrade**: If heavy features need the cloud, indicate that (e.g., “Advanced report available once connected”).
- **Progressive Disclosure**: Record data offline, display older cached results, and show a sync queue.
- **User Consent & Privacy**: Explain what will be uploaded and when.
- **Conflict Resolution**: Use timestamps and simple merge rules.

## 6. Security & Compliance

- **Data at Rest**: Store everything encrypted on-device (AES).
- **Minimal Upload**: Prefer embeddings over raw images.
- **Audit Log**: Locally record usage and transfer to server on sync.
- **Retention Policy**: Define how long records remain on-device.

## 7. Quick Decision Map

1. Implement local DB + upload queue + sync service (simple).
2. Implement precompute embedding on-device (if MedSigLIP can run).
3. Wire server endpoint (`/api/sync_case`) that accepts batched embeddings.
4. Add UI states and consent screens.
5. Start model compression experiments (quantize/distill).
6. Add SMS/USSD fallback only if needed.
