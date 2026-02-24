/**
 * PediScreen L2 IoT Batcher — batches 10k sensor readings per shard and submits to PediScreenL2DrugTrace (Base).
 * High-volume IoT pharma tracking: 1M+ temp sensors/min → 16 shards → L2 batchTemperatureUpdate.
 */

import { ethers } from "ethers";

const PEDI_L2_DRUG_TRACE_ABI = [
  "function batchTemperatureUpdate(uint8 _shardId, bytes32[] calldata _serialHashes, int16[] calldata _temperatures, uint256[] calldata _timestamps) external",
  "function batchCounter() view returns (uint256)",
  "function SHARD_COUNT() view returns (uint256)",
  "function BATCH_SIZE() view returns (uint256)",
];

export interface SensorReading {
  serialNumber: string;
  temperature: number; // °C
  humidity?: number;
  timestamp: number; // ms
}

export class IoTBatcher {
  private contract: ethers.Contract;
  private shardCounter = 0;
  private readonly BATCH_SIZE = 10000;
  private readonly SHARD_COUNT = 16;

  constructor(provider: ethers.Provider, address: string, signer?: ethers.Signer) {
    const signerOrProvider = signer ?? provider;
    this.contract = new ethers.Contract(address, PEDI_L2_DRUG_TRACE_ABI, signerOrProvider);
  }

  /**
   * Process sensor stream: accumulate 10k readings, then submit per shard (round-robin).
   */
  async batchSensors(sensorData: SensorReading[]): Promise<void> {
    const batch: SensorReading[] = [];

    for (const reading of sensorData) {
      batch.push(reading);
      if (batch.length === this.BATCH_SIZE) {
        const shardId = this.shardCounter++ % this.SHARD_COUNT;
        await this.submitBatch(shardId, [...batch]);
        batch.length = 0;
      }
    }

    if (batch.length > 0) {
      // Pad to BATCH_SIZE if required by contract (or submit in a separate "partial batch" flow)
      console.warn(`IoTBatcher: ${batch.length} readings left (not submitted; contract requires exactly ${this.BATCH_SIZE})`);
    }
  }

  private async submitBatch(shardId: number, batch: SensorReading[]): Promise<void> {
    const serialHashes = batch.map((r) =>
      ethers.keccak256(ethers.toUtf8Bytes(r.serialNumber))
    );
    const temperatures = batch.map((r) => Math.round(r.temperature * 100)); // °C * 100 (int16)
    const timestamps = batch.map((r) => Math.floor(r.timestamp / 1000));

    const tx = await this.contract.batchTemperatureUpdate(
      shardId,
      serialHashes,
      temperatures,
      timestamps
    );

    console.log(`Batch submitted: ${tx.hash} (Shard ${shardId})`);
    await tx.wait();
  }
}
