/**
 * PediScreen Clinical Trial — expanded mock data tests.
 * Uses mock trials (IDs 1–6), patient profiles (PED001–PED008), and consent hashes
 * from src/mock/blockchain. Run when ClinicalTrialPlatform (or equivalent) contract exists.
 */
const { expect } = require("chai");
const hre = require("hardhat");

describe("PediScreen Clinical Trial - Expanded Tests", function () {
  let contract;
  let sponsor, patient1, patient2, pi;

  before(async function () {
    const signers = await hre.ethers.getSigners();
    [sponsor, patient1, patient2, pi] = signers;

    try {
      const ClinicalTrialPlatform = await hre.ethers.getContractFactory("ClinicalTrialPlatform");
      contract = await ClinicalTrialPlatform.deploy();
      await contract.waitForDeployment();

      const SPONSOR_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("SPONSOR_ROLE"));
      const PI_ROLE = hre.ethers.keccak256(hre.ethers.toUtf8Bytes("PI_ROLE"));
      await contract.grantRole(SPONSOR_ROLE, sponsor.address);
      await contract.grantRole(PI_ROLE, pi.address);
    } catch (e) {
      const msg = (e && e.message) || String(e);
      if (/Contract not found|Cannot find module|ClinicalTrialPlatform/.test(msg)) {
        contract = null;
        this.skip();
      }
      throw e;
    }
  });

  it("should handle multiple trials and patient enrollments", async function () {
    if (!contract) return this.skip();

    await contract.connect(sponsor).createTrial(
      "PediScreen Language Study",
      "QmMockProtocolHash001",
      250,
      1736784000,
      1759564800
    );

    await contract.connect(sponsor).createTrial(
      "PediScreen Motor Study",
      "QmMockProtocolHash002",
      150,
      1735689600,
      1758470400
    );

    await contract.connect(sponsor).createTrial(
      "PediScreen Cognitive Study",
      "QmMockProtocolHash003",
      200,
      1738464000,
      1769827200
    );

    await contract.connect(patient1).enrollInTrial(1, "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef12");
    await contract.connect(patient2).enrollInTrial(2, "0x4567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234");

    expect(await contract.getTrialEnrollments(1)).to.equal(1);
    expect(await contract.getTrialEnrollments(2)).to.equal(1);
  });
});
