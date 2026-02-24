# PediScreen L2 IoT Batcher

Batches 10k sensor readings per shard and submits to **PediScreenL2DrugTrace** (Base). For high-volume IoT pharma: 1M+ temp sensors/min → 16 shards → L2 `batchTemperatureUpdate`.

## Usage

- **Contract:** Deploy `PediScreenL2DrugTrace` on Base; grant `IOT_ROLE` to the batcher wallet.
- **Run:** From repo root (with `ethers` available via Hardhat or `npm install ethers`):

```ts
import { IoTBatcher } from "./services/iotBatcher";
import { ethers } from "ethers";

const provider = new ethers.JsonRpcProvider(process.env.BASE_RPC_URL || "https://mainnet.base.org");
const signer = new ethers.Wallet(process.env.IOT_BATCHER_PRIVATE_KEY!, provider);
const batcher = new IoTBatcher(provider, process.env.L2_DRUG_TRACE_ADDRESS!, signer);

const readings = []; // 10k+ SensorReading: { serialNumber, temperature, humidity?, timestamp }
await batcher.batchSensors(readings);
```

See [docs/LAYER2_SCALABILITY.md](../docs/LAYER2_SCALABILITY.md) for full L2 architecture and deployment.
