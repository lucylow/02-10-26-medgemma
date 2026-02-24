const { expect } = require("chai");
const hre = require("hardhat");

describe("HealthChain POC", function () {
  let healthChain;
  let chw, clinic, patient;
  const recordHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("ipfs-cid-QmTest"));
  const patientId = "Patient/pedi-001";
  const recordType = "Observation";

  beforeEach(async function () {
    [chw, clinic, patient] = await hre.ethers.getSigners();
    const HealthChainPOC = await hre.ethers.getContractFactory("HealthChainPOC");
    healthChain = await HealthChainPOC.deploy();
    await healthChain.waitForDeployment();

    const CHW_ROLE = await healthChain.CHW_ROLE();
    const PATIENT_ROLE = await healthChain.PATIENT_ROLE();
    await healthChain.grantRole(CHW_ROLE, chw.address);
    await healthChain.grantRole(PATIENT_ROLE, patient.address);
  });

  it("should deploy with admin and CHW role", async function () {
    const CHW_ROLE = await healthChain.CHW_ROLE();
    expect(await healthChain.hasRole(CHW_ROLE, chw.address)).to.be.true;
    expect(await healthChain.recordCounter()).to.equal(0);
  });

  it("should create patient record when CHW signs", async function () {
    const chainId = (await hre.ethers.provider.getNetwork()).chainId;
    const messageHash = hre.ethers.solidityPackedKeccak256(
      ["bytes32", "uint256"],
      [recordHash, chainId]
    );
    const signature = await chw.signMessage(hre.ethers.getBytes(messageHash));

    await expect(
      healthChain.connect(chw).createPatientRecord(recordHash, patientId, recordType, signature)
    )
      .to.emit(healthChain, "RecordCreated")
      .withArgs(recordHash, patientId, recordType);

    expect(await healthChain.recordCounter()).to.equal(1);
    const rec = await healthChain.records(recordHash);
    expect(rec.recordHash).to.equal(recordHash);
    expect(rec.patientId).to.equal(patientId);
    expect(rec.recordType).to.equal(recordType);
    expect(rec.owner).to.equal(chw.address);
    expect(rec.active).to.be.true;
    expect(await healthChain.patientIdToHash(patientId)).to.equal(recordHash);
  });

  it("should reject createPatientRecord with invalid signature", async function () {
    const wrongHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("wrong"));
    const chainId = (await hre.ethers.provider.getNetwork()).chainId;
    const messageHash = hre.ethers.solidityPackedKeccak256(
      ["bytes32", "uint256"],
      [recordHash, chainId]
    );
    const signature = await chw.signMessage(hre.ethers.getBytes(messageHash));

    await expect(
      healthChain.connect(chw).createPatientRecord(wrongHash, patientId, recordType, signature)
    ).to.be.revertedWith("Invalid signature");
  });

  it("should grant consent and allow clinic to access record", async function () {
    const chainId = (await hre.ethers.provider.getNetwork()).chainId;
    const messageHash = hre.ethers.solidityPackedKeccak256(
      ["bytes32", "uint256"],
      [recordHash, chainId]
    );
    const signature = await chw.signMessage(hre.ethers.getBytes(messageHash));
    await healthChain.connect(chw).createPatientRecord(recordHash, patientId, recordType, signature);

    const expiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    await expect(
      healthChain.connect(chw).grantConsent(recordHash, [clinic.address], expiry)
    )
      .to.emit(healthChain, "ConsentGranted")
      .withArgs(recordHash, chw.address, [clinic.address]);

    const rec = await healthChain.connect(clinic).accessRecord(recordHash);
    expect(rec.recordHash).to.equal(recordHash);
    expect(rec.patientId).to.equal(patientId);
    expect(rec.owner).to.equal(chw.address);
  });

  it("should reject access without consent", async function () {
    const chainId = (await hre.ethers.provider.getNetwork()).chainId;
    const messageHash = hre.ethers.solidityPackedKeccak256(
      ["bytes32", "uint256"],
      [recordHash, chainId]
    );
    const signature = await chw.signMessage(hre.ethers.getBytes(messageHash));
    await healthChain.connect(chw).createPatientRecord(recordHash, patientId, recordType, signature);

    await expect(healthChain.connect(clinic).accessRecord(recordHash)).to.be.revertedWith(
      "No access rights"
    );
  });

  it("should verify record integrity", async function () {
    const chainId = (await hre.ethers.provider.getNetwork()).chainId;
    const messageHash = hre.ethers.solidityPackedKeccak256(
      ["bytes32", "uint256"],
      [recordHash, chainId]
    );
    const signature = await chw.signMessage(hre.ethers.getBytes(messageHash));
    await healthChain.connect(chw).createPatientRecord(recordHash, patientId, recordType, signature);

    expect(await healthChain.verifyRecord(recordHash, recordHash)).to.be.true;
    const otherHash = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("other"));
    expect(await healthChain.verifyRecord(recordHash, otherHash)).to.be.false;
  });

  it("should revoke consent and deny access", async function () {
    const chainId = (await hre.ethers.provider.getNetwork()).chainId;
    const messageHash = hre.ethers.solidityPackedKeccak256(
      ["bytes32", "uint256"],
      [recordHash, chainId]
    );
    const signature = await chw.signMessage(hre.ethers.getBytes(messageHash));
    await healthChain.connect(chw).createPatientRecord(recordHash, patientId, recordType, signature);
    const expiry = Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60;
    await healthChain.connect(chw).grantConsent(recordHash, [clinic.address], expiry);

    await healthChain.connect(chw).revokeConsent(recordHash);
    await expect(healthChain.connect(clinic).accessRecord(recordHash)).to.be.revertedWith(
      "Consent revoked"
    );
  });
});
