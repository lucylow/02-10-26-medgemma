const { expect } = require("chai");
const hre = require("hardhat");

describe("PediScreen DAO", function () {
  let dao, psdao, treasury, timelock, mockUsdc;
  let deployer, clinician, voter1, voter2;

  beforeEach(async function () {
    [deployer, clinician, voter1, voter2] = await hre.ethers.getSigners();

    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    mockUsdc = await MockUSDC.deploy(deployer.address);
    await mockUsdc.waitForDeployment();
    const usdcAddress = await mockUsdc.getAddress();

    const PSDAOToken = await hre.ethers.getContractFactory("PSDAOToken");
    psdao = await PSDAOToken.deploy(deployer.address);
    await psdao.waitForDeployment();

    const TimelockController = await hre.ethers.getContractFactory("TimelockController");
    timelock = await TimelockController.deploy(
      2 * 24 * 60 * 60,
      [deployer.address],
      [deployer.address],
      deployer.address
    );
    await timelock.waitForDeployment();

    const PediScreenTreasury = await hre.ethers.getContractFactory("PediScreenTreasury");
    treasury = await PediScreenTreasury.deploy(usdcAddress);
    await treasury.waitForDeployment();

    const PediScreenDAO = await hre.ethers.getContractFactory("PediScreenDAO");
    dao = await PediScreenDAO.deploy(
      await psdao.getAddress(),
      await timelock.getAddress(),
      await treasury.getAddress(),
      hre.ethers.ZeroAddress
    );
    await dao.waitForDeployment();

    await psdao.setDAO(await dao.getAddress());
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    await timelock.grantRole(PROPOSER_ROLE, await dao.getAddress());
    await timelock.grantRole(EXECUTOR_ROLE, await dao.getAddress());

    const DAO_ROLE = await treasury.DAO_ROLE();
    await treasury.grantRole(DAO_ROLE, await timelock.getAddress());
    await treasury.grantRole(DAO_ROLE, deployer.address);
  });

  it("should deploy with correct initial state", async function () {
    expect(await dao.treasury()).to.equal(await treasury.getAddress());
    expect(await psdao.dao()).to.equal(await dao.getAddress());
    expect(await treasury.screeningRate()).to.equal(50000);
  });

  it("should process clinician payment when DAO_ROLE calls payClinician", async function () {
    const treasuryAddress = await treasury.getAddress();
    await mockUsdc.transfer(treasuryAddress, hre.ethers.parseUnits("1000", 6));

    await treasury.payClinician(1, clinician.address);
    expect(await treasury.clinicianPendingRewards(clinician.address)).to.equal(50000);

    await treasury.payClinician(2, clinician.address);
    expect(await treasury.clinicianPendingRewards(clinician.address)).to.equal(100000);
    expect(await treasury.totalScreenings()).to.equal(2);
  });

  it("should emit ScreeningPayment on payClinician", async function () {
    await mockUsdc.transfer(await treasury.getAddress(), hre.ethers.parseUnits("1000", 6));
    await expect(treasury.payClinician(1, clinician.address))
      .to.emit(treasury, "ScreeningPayment")
      .withArgs(clinician.address, 50000, 1);
  });

  it("should allow clinician to withdraw rewards", async function () {
    await mockUsdc.transfer(await treasury.getAddress(), hre.ethers.parseUnits("1000", 6));
    await treasury.payClinician(1, clinician.address);
    const balanceBefore = await mockUsdc.balanceOf(clinician.address);
    await treasury.connect(clinician).withdrawRewards();
    const balanceAfter = await mockUsdc.balanceOf(clinician.address);
    expect(balanceAfter - balanceBefore).to.equal(50000);
    expect(await treasury.clinicianPendingRewards(clinician.address)).to.equal(0);
  });

  it("should revert withdraw when no rewards", async function () {
    await expect(treasury.connect(clinician).withdrawRewards()).to.be.revertedWith("No rewards");
  });

  it("PSDAO token should have 10M supply", async function () {
    expect(await psdao.totalSupply()).to.equal(hre.ethers.parseEther("10000000"));
  });
});
