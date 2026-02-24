const { expect } = require("chai");
const hre = require("hardhat");

describe("PediScreen Clinical Trial", function () {
  let contract;
  let sponsor, patient1, pi;

  beforeEach(async function () {
    [sponsor, patient1, pi] = await hre.ethers.getSigners();

    const ClinicalTrialPlatform = await hre.ethers.getContractFactory(
      "ClinicalTrialPlatform"
    );
    contract = await ClinicalTrialPlatform.deploy();
    await contract.waitForDeployment();

    const SPONSOR_ROLE = await contract.SPONSOR_ROLE();
    const PI_ROLE = await contract.PI_ROLE();
    await contract.grantRole(SPONSOR_ROLE, sponsor.address);
    await contract.grantRole(PI_ROLE, pi.address);
  });

  it("should create trial and enroll patient", async function () {
    await contract.connect(sponsor).createTrial(
      "PediScreen Language Study",
      "QmMockProtocolHash001",
      250,
      365
    );

    await expect(
      contract.connect(patient1).enrollAndConsent(
        1,
        "QmMockConsentHash001",
        true
      )
    )
      .to.emit(contract, "PatientEnrolled")
      .withArgs(1, patient1.address);
  });

  it("should create trial with mock data values", async function () {
    await contract.connect(sponsor).createTrial(
      "PediScreen AI: Early Language Intervention Study",
      "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco",
      250,
      365
    );

    const trial = await contract.trials(1);
    expect(trial.title).to.equal("PediScreen AI: Early Language Intervention Study");
    expect(trial.protocolHash).to.equal(
      "QmXoypizjW3WknFiJnKLwHCnL72vedxjQkDDP1mXWo6uco"
    );
    expect(trial.maxPatients).to.equal(250);
    expect(trial.enrolled).to.equal(0);
    expect(trial.active).to.equal(true);
    expect(trial.sponsor).to.equal(sponsor.address);
  });

  it("should revert when non-sponsor creates trial", async function () {
    await expect(
      contract.connect(patient1).createTrial(
        "Unauthorized Trial",
        "QmHash",
        100,
        180
      )
    ).to.be.reverted;
  });

  it("should get trial consent count after enrollment", async function () {
    await contract.connect(sponsor).createTrial(
      "PediScreen Language Study",
      "QmMockProtocolHash001",
      250,
      365
    );
    expect(await contract.getTrialConsentCount(1)).to.equal(0);

    await contract.connect(patient1).enrollAndConsent(1, "QmConsent1", true);
    expect(await contract.getTrialConsentCount(1)).to.equal(1);

    const signers = await hre.ethers.getSigners();
    const patient2 = signers[3];
    await contract.connect(patient2).enrollAndConsent(1, "QmConsent2", false);
    expect(await contract.getTrialConsentCount(1)).to.equal(2);
  });
});
