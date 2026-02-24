const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PediScreen Contracts", function () {
  let factory, registry, escrow, usdc, owner, clinician, patient;

  beforeEach(async function () {
    [owner, clinician, patient] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy(owner.address);

    const Factory = await ethers.getContractFactory("PediScreenFactory");
    factory = await Factory.deploy(await usdc.getAddress());

    const [registryAddr, escrowAddr] = await factory.getContracts();
    registry = await ethers.getContractAt("PediScreenRegistry", registryAddr);
    escrow = await ethers.getContractAt("PaymentEscrow", escrowAddr);

    await usdc.approve(await escrow.getAddress(), ethers.MaxUint256);
  });

  describe("Minting", function () {
    it("Should mint screening NFT", async function () {
      const report = {
        boneAgeMonths: 24,
        hasFracture: false,
        fractureType: "none",
        aiModelVersion: "medgemma-2b-v1",
        ipfsHash: "QmX...",
        clinician: clinician.address,
        timestamp: Math.floor(Date.now() / 1000),
        confidence: 9500,
      };

      await factory.mintScreening(patient.address, report);

      expect(await registry.ownerOf(1n)).to.equal(patient.address);
      expect(await registry.balanceOf(patient.address)).to.equal(1n);
    });
  });

  describe("Payments", function () {
    it("Should process clinician payment with fee", async function () {
      await escrow.grantRole(await escrow.CLINICIAN_ROLE(), clinician.address);

      const paymentAmount = ethers.parseUnits("0.05", 6);
      await escrow.payClinician(1n, paymentAmount, clinician.address);

      expect(await usdc.balanceOf(clinician.address)).to.be.gt(0n);
    });
  });

  describe("Access Control", function () {
    it("Should restrict unauthorized minting", async function () {
      const report = {
        boneAgeMonths: 24,
        hasFracture: false,
        fractureType: "none",
        aiModelVersion: "medgemma-2b-v1",
        ipfsHash: "QmX...",
        clinician: clinician.address,
        timestamp: Math.floor(Date.now() / 1000),
        confidence: 9500,
      };
      await expect(
        factory.connect(clinician).mintScreening(patient.address, report)
      ).to.be.reverted;
    });
  });
});
