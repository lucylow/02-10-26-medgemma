/**
 * PediScreenTreasuryMultiSig — Hardhat test (2/3 clinician approval)
 * Run: npx hardhat test test/PediScreenTreasuryMultiSig.test.js
 */
const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("PediScreenTreasuryMultiSig", function () {
  let treasury, usdc;
  let owner, clinician1, clinician2, clinician3, recipient, other;

  const APPROVAL_THRESHOLD = 2;
  const USDC_DECIMALS = 6;
  const amount = ethers.parseUnits("1000", USDC_DECIMALS);

  beforeEach(async function () {
    [owner, clinician1, clinician2, clinician3, recipient, other] = await ethers.getSigners();

    const MockUSDC = await ethers.getContractFactory("MockUSDC");
    usdc = await MockUSDC.deploy(owner.address);
    await usdc.waitForDeployment();

    const PediScreenTreasuryMultiSig = await ethers.getContractFactory("PediScreenTreasuryMultiSig");
    treasury = await PediScreenTreasuryMultiSig.deploy(await usdc.getAddress());
    await treasury.waitForDeployment();

    await usdc.transfer(await treasury.getAddress(), ethers.parseUnits("100000", USDC_DECIMALS));

    await treasury.addClinician(clinician1.address, "ipfs://license1");
    await treasury.addClinician(clinician2.address, "ipfs://license2");
    await treasury.addClinician(clinician3.address, "ipfs://license3");
  });

  it("should create request and auto-approve creator", async function () {
    await treasury.connect(clinician1).createPaymentRequest(recipient.address, amount, "Test payment");
    const [,,, approvals, executed] = await treasury.getRequestStatus(0);
    expect(approvals).to.equal(1);
    expect(executed).to.be.false;
  });

  it("should reach 2/3 and auto-execute", async function () {
    await treasury.connect(clinician1).createPaymentRequest(recipient.address, amount, "Salary");
    await treasury.connect(clinician2).approvePayment(0);
    const [,,, approvals, executed] = await treasury.getRequestStatus(0);
    expect(approvals).to.equal(APPROVAL_THRESHOLD);
    expect(executed).to.be.true;
    expect(await usdc.balanceOf(recipient.address)).to.equal(amount);
  });

  it("should reject approve from non-clinician", async function () {
    await treasury.connect(clinician1).createPaymentRequest(recipient.address, amount, "Test");
    await expect(treasury.connect(other).approvePayment(0)).to.be.revertedWith("Not a clinician");
  });

  it("should reject second approve from same clinician (already approved)", async function () {
    await treasury.connect(clinician1).createPaymentRequest(recipient.address, amount, "Test");
    await treasury.connect(clinician2).approvePayment(0);
    await expect(treasury.connect(clinician2).approvePayment(0)).to.be.revertedWith(
      "Already approved"
    );
  });

  it("should reject execute without threshold", async function () {
    await treasury.connect(clinician1).createPaymentRequest(recipient.address, amount, "Test");
    await expect(treasury.connect(clinician1).executePayment(0)).to.be.revertedWith(
      "Insufficient approvals"
    );
  });

  it("should allow cancel by clinician (EOA)", async function () {
    await treasury.connect(clinician1).createPaymentRequest(recipient.address, amount, "Test");
    await treasury.connect(clinician1).cancelPayment(0);
    const [,,,,, cancelled] = await treasury.getRequestStatus(0);
    expect(cancelled).to.be.true;
    await expect(treasury.connect(clinician2).approvePayment(0)).to.be.revertedWith("Cancelled");
  });

  it("should report treasury balance", async function () {
    const bal = await treasury.treasuryBalance();
    expect(bal).to.equal(ethers.parseUnits("100000", USDC_DECIMALS));
  });

  it("should pause and block create", async function () {
    await treasury.setPaused(true);
    await expect(
      treasury.connect(clinician1).createPaymentRequest(recipient.address, amount, "Test")
    ).to.be.revertedWith("Paused");
  });
});
