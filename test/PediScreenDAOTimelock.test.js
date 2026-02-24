const { time, loadFixture } = require("@nomicfoundation/hardhat-network-helpers");
const { expect } = require("chai");
const hre = require("hardhat");

describe("PediScreen DAO Timelock", function () {
  const TIMELOCK_DELAY = 48 * 60 * 60; // 48 hours
  const VOTING_PERIOD_BLOCKS = 45818;

  async function deployCompleteFixture() {
    const [deployer, voter1, voter2, clinician] = await hre.ethers.getSigners();

    const MockUSDC = await hre.ethers.getContractFactory("MockUSDC");
    const mockUsdc = await MockUSDC.deploy(deployer.address);
    await mockUsdc.waitForDeployment();
    const usdcAddress = await mockUsdc.getAddress();

    const PSDAOToken = await hre.ethers.getContractFactory("PSDAOToken");
    const psdao = await PSDAOToken.deploy(deployer.address);
    await psdao.waitForDeployment();

    const TimelockController = await hre.ethers.getContractFactory("TimelockController");
    const timelock = await TimelockController.deploy(
      TIMELOCK_DELAY,
      [deployer.address],
      [deployer.address],
      deployer.address
    );
    await timelock.waitForDeployment();

    const PediScreenTreasury = await hre.ethers.getContractFactory("PediScreenTreasury");
    const treasury = await PediScreenTreasury.deploy(usdcAddress);
    await treasury.waitForDeployment();

    const PediScreenDAO = await hre.ethers.getContractFactory("PediScreenDAO");
    const dao = await PediScreenDAO.deploy(
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

    // Mint voting tokens and delegate (clock is block number; need voting power at proposal time)
    const amount = hre.ethers.parseEther("1000000");
    await psdao.transfer(voter1.address, amount);
    await psdao.transfer(voter2.address, amount);
    await psdao.connect(voter1).delegate(voter1.address);
    await psdao.connect(voter2).delegate(voter2.address);

    return {
      dao,
      timelock,
      psdao,
      treasury,
      deployer,
      voter1,
      voter2,
      clinician,
    };
  }

  function getProposalIdFromReceipt(receipt) {
    const iface = new hre.ethers.Interface([
      "event ProposalCreated(uint256 proposalId, address proposer, address[] targets, uint256[] values, string[] signatures, bytes[] calldatas, uint256 voteStart, uint256 voteEnd, string description)",
    ]);
    for (const log of receipt.logs) {
      try {
        const parsed = iface.parseLog({ topics: log.topics, data: log.data });
        if (parsed && parsed.name === "ProposalCreated") return parsed.args.proposalId;
      } catch (_) {}
    }
    return receipt.logs[0]?.args?.proposalId ?? receipt.logs?.[0]?.args?.[0];
  }

  it("should enforce 48-hour timelock delay", async function () {
    const { dao, timelock, voter1 } = await loadFixture(deployCompleteFixture);

    const tx = await dao.connect(voter1).proposePaymentRate(100);
    const receipt = await tx.wait();
    const proposalId = getProposalIdFromReceipt(receipt);
    expect(proposalId).to.be.ok;

    // Vote for
    await dao.connect(voter1).castVote(proposalId, 1);
    await dao.connect(voter2).castVote(proposalId, 1);

    // Advance past voting period (block-number clock)
    await hre.network.provider.send("hardhat_mine", ["0x" + (VOTING_PERIOD_BLOCKS + 10).toString(16)]);

    expect(await dao.state(proposalId)).to.equal(4); // Succeeded

    // Queue (starts timelock)
    await dao.queue(proposalId);
    expect(await dao.state(proposalId)).to.equal(5); // Queued

    // Cannot execute during timelock
    await expect(dao.executeTimelockedProposal(proposalId)).to.be.reverted;

    // Advance 48h (time-based timelock)
    await time.increase(TIMELOCK_DELAY + 1);

    await dao.executeTimelockedProposal(proposalId);
    expect(await dao.state(proposalId)).to.equal(7); // Executed
  });

  it("payment rate updates only after timelock", async function () {
    const { dao, treasury, voter1, voter2 } = await loadFixture(deployCompleteFixture);

    const oldRate = await treasury.screeningRate();

    const tx = await dao.connect(voter1).proposePaymentRate(750);
    const receipt = await tx.wait();
    const proposalId = getProposalIdFromReceipt(receipt);

    await dao.connect(voter1).castVote(proposalId, 1);
    await dao.connect(voter2).castVote(proposalId, 1);

    await hre.network.provider.send("hardhat_mine", ["0x" + (VOTING_PERIOD_BLOCKS + 10).toString(16)]);
    await dao.queue(proposalId);
    await time.increase(TIMELOCK_DELAY + 1);
    await dao.executeTimelockedProposal(proposalId);

    expect(await treasury.screeningRate()).to.equal(750);
    expect(await treasury.screeningRate()).not.to.equal(oldRate);
  });
});
