const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const hre = require("hardhat");

describe("PediScreen gas-optimized medical hashing", function () {
  async function deployFixture() {
    const [owner, other] = await hre.ethers.getSigners();
    const TestPacker = await hre.ethers.getContractFactory("TestPediScreenHashPacker");
    const testPacker = await TestPacker.deploy();
    await testPacker.waitForDeployment();

    const MerkleBatches = await hre.ethers.getContractFactory("PediScreenMerkleBatches");
    const merkleBatches = await MerkleBatches.deploy();
    await merkleBatches.waitForDeployment();

    const StorageOpt = await hre.ethers.getContractFactory("PediScreenStorageOpt");
    const storageOpt = await StorageOpt.deploy();
    await storageOpt.waitForDeployment();

    return { testPacker, merkleBatches, storageOpt, owner, other };
  }

  describe("PediScreenHashPacker", function () {
    it("packs and unpacks medical hash metadata", async function () {
      const { testPacker } = await loadFixture(deployFixture);
      const dataHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("PHI"));
      const childAge = 36; // months
      const riskLevel = 2;
      const domainId = 100;
      const timestamp = 1700000000; // 40-bit safe
      const clinicId = 500;

      const [outHash, packedMeta] = await testPacker.packMedicalHash(
        dataHash,
        childAge,
        riskLevel,
        domainId,
        timestamp,
        clinicId
      );
      expect(outHash).to.equal(dataHash);
      expect(packedMeta).to.be.gt(0);

      const [a, r, d, t, c] = await testPacker.unpackMedicalHash(packedMeta);
      expect(a).to.equal(childAge);
      expect(r).to.equal(riskLevel);
      expect(d).to.equal(domainId);
      expect(t).to.equal(timestamp);
      expect(c).to.equal(clinicId);
    });

    it("hashes medical record with precomputed prefixes", async function () {
      const { testPacker, owner } = await loadFixture(deployFixture);
      const ipfsCid = hre.ethers.getBytes(hre.ethers.toUtf8Bytes("QmTest46bytesCIDv0xxxxxxxxxxxxxxxxxx"));
      const childAge = 24;
      const riskLevel = 1;
      const hash = await testPacker.hashMedicalRecord(
        owner.address,
        ipfsCid,
        childAge,
        riskLevel
      );
      expect(hash).to.match(/^0x[0-9a-fA-F]{64}$/);
      expect(hash).to.not.equal(hre.ethers.ZeroHash);
    });
  });

  describe("PediScreenMerkleBatches", function () {
    it("submits batch and verifies record inclusion", async function () {
      const { merkleBatches } = await loadFixture(deployFixture);
      const leaf = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("record1"));
      const leaves = [leaf];
      const root = leaf; // single-leaf tree: root equals leaf, proof is empty
      await merkleBatches.submitMedicalBatch(leaves, root);
      expect(await merkleBatches.batchCount()).to.equal(1);
      expect(await merkleBatches.getBatchRoot(0)).to.equal(root);
      const valid = await merkleBatches.verifyRecord(0, 0, leaf, []);
      expect(valid).to.be.true;
    });

    it("reverts on batch size > 100", async function () {
      const { merkleBatches } = await loadFixture(deployFixture);
      const hashes = Array(101).fill(hre.ethers.ZeroHash);
      const root = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("root"));
      await expect(merkleBatches.submitMedicalBatch(hashes, root)).to.be.revertedWith("Batch size 1-100");
    });
  });

  describe("PediScreenStorageOpt", function () {
    it("writes and reads batch slot", async function () {
      const { storageOpt, owner } = await loadFixture(deployFixture);
      const dataHashes = [
        hre.ethers.keccak256(hre.ethers.toUtf8Bytes("h1")),
        hre.ethers.keccak256(hre.ethers.toUtf8Bytes("h2")),
      ];
      const packedMetas = [12345n, 67890n];
      await storageOpt.writeBatchSlot(0, dataHashes, packedMetas);
      const [outHashes, outMetas] = await storageOpt.readBatchSlot(0);
      expect(outHashes[0]).to.equal(dataHashes[0]);
      expect(outHashes[1]).to.equal(dataHashes[1]);
      expect(outMetas[0]).to.equal(12345n);
      expect(outMetas[1]).to.equal(67890n);
    });

    it("sets and reads patient status flags", async function () {
      const { storageOpt, owner, other } = await loadFixture(deployFixture);
      await storageOpt.setPatientStatus(other.address, 1, 1, 1);
      expect(await storageOpt.getConsent(other.address)).to.equal(1);
      expect(await storageOpt.getActive(other.address)).to.equal(1);
      expect(await storageOpt.getVerified(other.address)).to.equal(1);
    });
  });
});
