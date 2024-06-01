import {
  mine,
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

const DAY = 86400;
const WEEK = 604800;

async function addTime(amount: number) {
  const now = await time.latest();
  await time.increaseTo(now + amount);
}

describe("MiniDAO", function () {
  async function deployDAO() {
    const [owner, acc1, acc2, acc3, acc4, acc5, acc6] =
      await hre.ethers.getSigners();

    const TimeLock = await hre.ethers.getContractFactory("TimeLock");
    const timeLock = await TimeLock.deploy(1, [owner], [owner], owner);

    const Token = await hre.ethers.getContractFactory("TokenDAO");
    const token = await Token.deploy(timeLock.target, "Token", "TKN");

    // token distribution
    await token.tokenDistribution(owner, 6000);

    await token.transfer(acc1, 1000);
    await token.transfer(acc2, 1000);
    await token.transfer(acc3, 1000);
    await token.transfer(acc4, 1000);
    await token.transfer(acc5, 1000);

    const MiniDAO = await hre.ethers.getContractFactory("MiniDAO");
    const miniDAO = await MiniDAO.deploy(
      token.target,
      timeLock.target,
      "miniDAO",
      DAY, // _votingDelay day
      WEEK, // _votingPeriod day
      4 // _quorumValue
    );

    const Treasury = await hre.ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(timeLock, { value: 10000 });
    expect(await treasury.owner()).to.equal(timeLock.target);

    // timelock settings
    const proposerRole = await timeLock.PROPOSER_ROLE();
    const executorRole = await timeLock.EXECUTOR_ROLE();
    await timeLock.connect(owner).grantRole(proposerRole, miniDAO);
    await timeLock.connect(owner).grantRole(executorRole, miniDAO);

    // delegate tokens
    await token.connect(owner).delegate(owner);
    await token.connect(acc1).delegate(acc1);
    await token.connect(acc2).delegate(acc2);
    await token.connect(acc3).delegate(acc3);
    await token.connect(acc4).delegate(acc4);

    return {
      token,
      miniDAO,
      timeLock,
      treasury,
      owner,
      acc1,
      acc2,
      acc3,
      acc4,
      acc5,
      acc6,
    };
  }

  it("Right name and symbol", async function () {
    const { token, miniDAO } = await loadFixture(deployDAO);
    expect(await token.name()).to.equal("Token");
    expect(await token.symbol()).to.equal("TKN");
    expect(await miniDAO.name()).to.equal("miniDAO");
  });

  it("Right owner", async function () {
    const { token, timeLock } = await loadFixture(deployDAO);
    expect(await token.owner()).to.equal(timeLock.target);
  });

  it("Simple Vouting", async function () {
    const { token, miniDAO, owner, acc1, acc2, acc3, acc4 } = await loadFixture(
      deployDAO
    );

    const description =
      "Let's repair the stairs on the third floor and paint the ceiling, walls, doors and locks on the same floor?";

    const targets: string[] = ["0x0000000000000000000000000000000000000000"];
    const values: number[] = [0];
    const calldatas: string[] = ["0x00"];

    const descriptionHash = hre.ethers.keccak256(
      hre.ethers.toUtf8Bytes(description)
    );

    await expect(
      miniDAO.propose(targets, values, calldatas, description)
    ).to.emit(miniDAO, "ProposalCreated");

    const proposalId = await miniDAO.hashProposal(
      targets,
      values,
      calldatas,
      descriptionHash
    );

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    console.log(await miniDAO.state(proposalId)); // Pending
    await addTime(DAY + 1);

    console.log("day");

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    console.log(await miniDAO.state(proposalId)); // Active

    // 0 = Against, 1 = For, 2 = Abstain
    await miniDAO.connect(owner).castVote(proposalId, 1);
    await miniDAO.connect(acc1).castVote(proposalId, 1);
    await miniDAO.connect(acc2).castVote(proposalId, 1);
    await miniDAO.connect(acc3).castVote(proposalId, 2);
    await miniDAO.connect(acc4).castVote(proposalId, 2);

    // [ Against, For, Abstain ]
    // console.log(await miniDAO.proposalVotes(proposalId));

    await addTime(WEEK / 2);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    console.log(await miniDAO.state(proposalId)); // Active

    await addTime(WEEK / 2 + 1);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    console.log(await miniDAO.state(proposalId)); // Succeeded

    await miniDAO.queue(targets, values, calldatas, descriptionHash);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    console.log(await miniDAO.state(proposalId)); // Queued

    const now = await time.latest();
    await time.increaseTo(now + 100);

    await miniDAO.execute(targets, values, calldatas, descriptionHash);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    console.log(await miniDAO.state(proposalId)); // Executed
  });

  it.skip("Vouting pay grant", async function () {
    const { miniDAO, owner, acc1, acc2, acc3, acc4, acc6, treasury } =
      await loadFixture(deployDAO);

    await expect(
      acc1.sendTransaction({
        to: treasury,
        value: hre.ethers.parseEther("10.0"),
      })
    ).to.changeEtherBalance(treasury, hre.ethers.parseEther("10.0"));

    let ABI = ["function releaseNativeToken(address to, uint256 amount)"];
    const iface = new hre.ethers.Interface(ABI);
    const calldata = iface.encodeFunctionData("releaseNativeToken", [
      acc6.address,
      hre.ethers.parseEther("1.1"),
    ]);

    const target = treasury.target;
    const description = "Pay out a grant to the first team";

    //console.log(calldata);

    // proposal created
    await expect(
      miniDAO.propose([target], [0], [calldata], description)
    ).to.emit(miniDAO, "ProposalCreated");

    const descriptionHash = hre.ethers.keccak256(
      hre.ethers.toUtf8Bytes(description)
    );

    const proposalId = await miniDAO.hashProposal(
      [target],
      [0],
      [calldata],
      descriptionHash
    );

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); // Pending

    await mine(6);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); // Active

    // 0 = Against, 1 = For, 2 = Abstain
    await miniDAO.connect(owner).castVote(proposalId, 1);
    await miniDAO.connect(acc1).castVote(proposalId, 1);
    await miniDAO.connect(acc2).castVote(proposalId, 1);
    await miniDAO.connect(acc3).castVote(proposalId, 2);
    await miniDAO.connect(acc4).castVote(proposalId, 2);

    // [ Against, For, Abstain ]
    // console.log(await miniDAO.proposalVotes(proposalId));

    await mine(50);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); // Active

    await mine(50);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); // Succeeded

    await miniDAO.queue([target], [0], [calldata], descriptionHash);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); // Queued

    const now = await time.latest();
    await time.increaseTo(now + 100);

    await expect(
      miniDAO.execute([target], [0], [calldata], descriptionHash)
    ).to.changeEtherBalance(acc6, hre.ethers.parseEther("1.1"));

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); // Executed
  });

  it.skip("Vouting Mint", async function () {
    const { token, miniDAO, owner, acc1, acc2, acc3, acc4, acc5 } =
      await loadFixture(deployDAO);

    const target = token.target;
    const calldata = (await token.mint.populateTransaction(acc5, 10000)).data;
    const description = "Mint 10000 tokens";

    // proposal created
    await expect(
      miniDAO.propose([target], [0], [calldata], description)
    ).to.emit(miniDAO, "ProposalCreated");

    const descriptionHash = hre.ethers.keccak256(
      hre.ethers.toUtf8Bytes(description)
    );

    const proposalId = await miniDAO.hashProposal(
      [target],
      [0],
      [calldata],
      descriptionHash
    );

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); // Pending

    await mine(6);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); // Active

    // 0 = Against, 1 = For, 2 = Abstain
    await miniDAO.connect(owner).castVote(proposalId, 1);
    await miniDAO.connect(acc1).castVote(proposalId, 1);
    await miniDAO.connect(acc2).castVote(proposalId, 1);
    await miniDAO.connect(acc3).castVote(proposalId, 2);
    await miniDAO.connect(acc4).castVote(proposalId, 2);

    // [ Against, For, Abstain ]
    // console.log(await miniDAO.proposalVotes(proposalId));

    await mine(50);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); // Active

    await mine(50);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); / / Succeeded;

    await miniDAO.queue([target], [0], [calldata], descriptionHash);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); // Queued

    const now = await time.latest();
    await time.increaseTo(now + 100);

    await miniDAO.execute([target], [0], [calldata], descriptionHash);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); // Executed

    // minted
    expect(await token.balanceOf(acc5)).to.be.equal(10000);
  });
});
