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
  TimeLock__factory,
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
      5, // _votingDelay
      100, // _votingPeriod
      4 // _quorumValue
    );

    const timeLockAddr = await superDAO.timeLock();
    const timeLock = TimeLock__factory.connect(timeLockAddr, owner);

    const tokenAddr = await superDAO.token();
    const token = TokenDAO__factory.connect(tokenAddr, owner);

    const miniDAOAddr = await superDAO.governor();
    const miniDAO = MiniDAO__factory.connect(miniDAOAddr, owner);

    const treasuryAddr = await superDAO.treasury();
    const treasury = Treasury__factory.connect(treasuryAddr, owner);
    expect(await treasury.owner()).to.equal(timeLockAddr);

    // token distribution
    await token.tokenDistribution(
      [owner, acc1, acc2, acc3, acc4],
      ["1000", "1000", "1000", "1000", "1000"]
    );

    // delegate tokens
    await token.connect(owner).delegate(owner);
    await token.connect(acc1).delegate(acc1);
    await token.connect(acc2).delegate(acc2);
    await token.connect(acc3).delegate(acc3);
    await token.connect(acc4).delegate(acc4);

    return {
      superDAO,
      timeLock,
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

  describe("Deployment", function () {
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

    it("Right timelock", async function () {
      const { miniDAO, timeLock } = await loadFixture(deployDAO);
      expect(await miniDAO.timelock()).to.equal(timeLock);
    });

    it("Right settings", async function () {
      const { miniDAO } = await loadFixture(deployDAO);

      expect(await miniDAO.votingDelay()).to.equal(5);
      expect(await miniDAO.votingPeriod()).to.equal(100);
    });
  });

  describe("Access control", function () {
    it("Grant Role", async function () {
      const { miniDAO, timeLock, owner, acc1 } = await loadFixture(deployDAO);

      await expect(
        timeLock
          .connect(owner)
          .grantRole(await timeLock.DEFAULT_ADMIN_ROLE(), miniDAO)
      ).to.emit(timeLock, "RoleGranted");

      await expect(
        timeLock
          .connect(acc1)
          .grantRole(await timeLock.DEFAULT_ADMIN_ROLE(), miniDAO)
      ).to.be.revertedWithCustomError(
        timeLock,
        "AccessControlUnauthorizedAccount"
      );
    });
  });

  describe("Token DAO", function () {
    it("unauthorized mint", async function () {
      const { token, owner } = await loadFixture(deployDAO);

      await expect(token.connect(owner).mint(owner, 1000)).to.be.revertedWith(
        "UNAUTHORIZED"
      );
    });

    it("attempting to redistribute the tokens a second time", async function () {
      const { token, owner } = await loadFixture(deployDAO);
      await expect(
        token.connect(owner).tokenDistribution([owner], [1000])
      ).to.be.revertedWith("A function can be called only once");
    });
  });

  describe("Treasury", function () {
    it("unauthorized releaseNativeToken", async function () {
      const { treasury, owner } = await loadFixture(deployDAO);

      await expect(
        treasury.connect(owner).releaseNativeToken(owner, 1000)
      ).to.be.revertedWith("UNAUTHORIZED");
    });

    it("unauthorized releaseERC20Token", async function () {
      const { treasury, owner, token } = await loadFixture(deployDAO);
      await expect(
        treasury.connect(owner).releaseERC20Token(owner, 1000, token)
      ).to.be.revertedWith("UNAUTHORIZED");
    });
  });

  describe("Vouting", function () {
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
        miniDAO.connect(acc4).propose(targets, values, calldatas, description)
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
      // console.log(await miniDAO.state(proposalId)); // Succeeded
    });

    it("Vouting Mint", async function () {
      const { token, miniDAO, owner, acc1, acc2, acc3, acc4, acc5 } =
        await loadFixture(deployDAO);

      const target = await token.getAddress();
      const calldata = (await token.mint.populateTransaction(acc5, 10000)).data;
      const description = "Mint 10000 tokens";

      const targets = [target];
      const values: number[] = [0];
      const calldatas: string[] = [calldata];

      // proposal created
      await expect(
        miniDAO.connect(acc2).propose(targets, values, calldatas, description)
      ).to.emit(miniDAO, "ProposalCreated");

      const descriptionHash = hre.ethers.keccak256(
        hre.ethers.toUtf8Bytes(description)
      );

      const proposalId = await miniDAO.hashProposal(
        targets,
        values,
        calldatas,
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

      await mine(400);

      //  States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
      // console.log(await miniDAO.state(proposalId)); // Succeeded;

      await miniDAO.queue(targets, values, calldatas, descriptionHash);

      // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
      //  console.log(await miniDAO.state(proposalId)); // Queued

      const now = await time.latest();
      await time.increaseTo(now + 100);

      await miniDAO.execute(targets, values, calldatas, descriptionHash);

      // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
      // console.log(await miniDAO.state(proposalId)); // Executed

      // minted
      expect(await token.balanceOf(acc5)).to.be.equal(10000);
    });

    it("Vouting pay grant in native tokens", async function () {
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

    it("Vouting pay grant in ERC20 tokens", async function () {
      const { miniDAO, owner, acc1, acc2, acc3, acc4, acc6, treasury } =
        await loadFixture(deployDAO);

      const ERC20 = await hre.ethers.getContractFactory("MockTokenERC20");
      const erc20 = await ERC20.deploy();

      await expect(erc20.connect(owner).transfer(treasury, 200000)).to.emit(
        erc20,
        "Transfer"
      );

      let ABI = [
        "function releaseERC20Token(address to, uint256 amount, address token)",
      ];
      const iface = new hre.ethers.Interface(ABI);
      const calldata = iface.encodeFunctionData("releaseERC20Token", [
        acc6.address,
        200000,
        erc20.target,
      ]);

      const target = treasury.target;
      const description = "Pay out a grant to the second team";

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
      ).to.changeTokenBalance(erc20, acc6, 200000);

      expect(await erc20.balanceOf(acc6)).to.be.equal(200000);

      // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
      // console.log(await miniDAO.state(proposalId)); // Executed
    });

    it("Send ERC721 token", async function () {
      const { miniDAO, owner, acc1, acc2, acc3, acc4, acc5, acc6, treasury } =
        await loadFixture(deployDAO);

      const ERC721 = await hre.ethers.getContractFactory("MockTokenERC721");
      const erc721 = await ERC721.deploy();

      const id = 0;

      await expect(
        erc721
          .connect(owner)
          ["safeTransferFrom(address,address,uint256)"](owner, treasury, id)
      ).to.emit(erc721, "Transfer");
      expect(await erc721.ownerOf(id)).to.be.equal(treasury);
      expect(await erc721.balanceOf(treasury)).to.be.equal(1);

      let ABI = [
        "function releaseERC721Token(address to, uint256 id, address token)",
      ];
      const iface = new hre.ethers.Interface(ABI);
      const calldata = iface.encodeFunctionData("releaseERC721Token", [
        acc6.address,
        0,
        erc721.target,
      ]);

      // const calldata = (
      //   await treasury.releaseERC721Token.populateTransaction(acc6, 0, erc721)
      // ).data;

      const target = treasury.target;
      const description = "Pay out a grant to the third team";

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

      await miniDAO
        .connect(acc4)
        .queue([target], [0], [calldata], descriptionHash);

      // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
      // console.log(await miniDAO.state(proposalId)); // Queued

      const now = await time.latest();
      await time.increaseTo(now + 100);

      await expect(
        miniDAO
          .connect(acc5)
          .execute([target], [0], [calldata], descriptionHash)
      ).to.emit(erc721, "Transfer");

      expect(await erc721.balanceOf(acc6)).to.be.equal(1);

      // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
      // console.log(await miniDAO.state(proposalId)); // Executed
    });
    it("Cancel proposal", async function () {
      const { miniDAO, owner, acc1, acc2, acc3, acc4, acc6, treasury } =
        await loadFixture(deployDAO);

      const ERC721 = await hre.ethers.getContractFactory("MockTokenERC721");
      const erc721 = await ERC721.deploy();

      const id = 0;

      await expect(
        erc721
          .connect(owner)
          ["safeTransferFrom(address,address,uint256)"](owner, treasury, id)
      ).to.emit(erc721, "Transfer");
      expect(await erc721.ownerOf(id)).to.be.equal(treasury);
      expect(await erc721.balanceOf(treasury)).to.be.equal(1);

      let ABI = [
        "function releaseERC721Token(address to, uint256 id, address token)",
      ];
      const iface = new hre.ethers.Interface(ABI);
      const calldata = iface.encodeFunctionData("releaseERC721Token", [
        acc6.address,
        0,
        erc721.target,
      ]);

      const target = treasury.target;
      const description = "Pay out a grant to the third team";

      // proposal created
      await expect(
        miniDAO.connect(acc1).propose([target], [0], [calldata], description)
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
      console.log(await miniDAO.state(proposalId)); // Pending

      await expect(
        miniDAO.connect(acc2).cancel([target], [0], [calldata], descriptionHash)
      ).to.be.revertedWithCustomError(miniDAO, "GovernorOnlyProposer");

      await expect(
        miniDAO
          .connect(owner)
          .cancel([target], [0], [calldata], descriptionHash)
      ).to.be.revertedWithCustomError(miniDAO, "GovernorOnlyProposer");

      await miniDAO
        .connect(acc1)
        .cancel([target], [0], [calldata], descriptionHash);

      await mine(6);

      // States: Pending, Active, Canceled, Defeated, Succeeded, Queued, Expired, Executed
      console.log(await miniDAO.state(proposalId)); // Active
    });
  });
});
