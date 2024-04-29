import {
  mine,
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

import {
  TokenDAO__factory,
  MiniDAO__factory,
  Treasury__factory,
} from "../typechain-types";

const DAY = 86400;
const WEEK = 604800;

describe("SuperDAO", function () {
  async function deployDAO() {
    const [owner, acc1, acc2, acc3, acc4, acc5, acc6] =
      await hre.ethers.getSigners();

    const SuperDAO = await hre.ethers.getContractFactory("SuperDAO");
    const superDAO = await SuperDAO.deploy(
      1,
      "Token",
      "TKN",
      "miniDAO",
      "50000",
      5, // _votingDelay
      20, // _votingPeriod
      4 // _quorumValue
    );

    const tokenAddr = await superDAO.token();
    const token = TokenDAO__factory.connect(tokenAddr, owner);

    const miniDAOAddr = await superDAO.governor();
    const miniDAO = MiniDAO__factory.connect(miniDAOAddr, owner);

    const treasuryAddr = await superDAO.treasury();
    const treasury = MiniDAO__factory.connect(treasuryAddr, owner);

    // token distribution
    await token.connect(owner).transfer(acc1, "1000");
    await token.connect(owner).transfer(acc2, "1000");
    await token.connect(owner).transfer(acc3, "1000");
    await token.connect(owner).transfer(acc4, "1000");

    // delegate tokens
    await token.connect(owner).delegate(owner);
    await token.connect(acc1).delegate(acc1);
    await token.connect(acc2).delegate(acc2);
    await token.connect(acc3).delegate(acc3);
    await token.connect(acc4).delegate(acc4);

    return {
      superDAO,
      token,
      treasury,
      miniDAO,
      owner,
      acc1,
      acc2,
      acc3,
      acc4,
      acc5,
      acc6,
    };
  }

  it("Deploy", async function () {
    const { superDAO } = await loadFixture(deployDAO);

    console.log(await superDAO.timeLock());
    console.log(await superDAO.token());
    console.log(await superDAO.governor());
    console.log(await superDAO.treasury());
  });

  it("Right name and symbol", async function () {
    const { token, miniDAO } = await loadFixture(deployDAO);
    expect(await token.name()).to.equal("Token");
    expect(await token.symbol()).to.equal("TKN");
    expect(await miniDAO.name()).to.equal("miniDAO");
  });

  it("Right owner", async function () {
    const { token, superDAO } = await loadFixture(deployDAO);
    expect(await token.owner()).to.equal(await superDAO.timeLock());
  });

  it("Simple Vouting", async function () {
    const { miniDAO, owner, acc1, acc2, acc3, acc4 } = await loadFixture(
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
    console.log(await miniDAO.state(proposalId)); // Succeeded

    await miniDAO.queue(targets, values, calldatas, descriptionHash);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); // Queued

    const now = await time.latest();
    await time.increaseTo(now + 100);

    await miniDAO.execute(targets, values, calldatas, descriptionHash);

    // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
    // console.log(await miniDAO.state(proposalId)); // Executed
  });

  it("Vouting Mint", async function () {
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
