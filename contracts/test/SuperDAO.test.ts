import {
  mine,
  time,
  loadFixture,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

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
      "DAO",
      "100000000",
      5, // _votingDelay
      20, // _votingPeriod
      4 // _quorumValue
    );

    return {
      superDAO,
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
});
