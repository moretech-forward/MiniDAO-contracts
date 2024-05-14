import { ethers } from "hardhat";

// npx hardhat run scripts/deploySuperDAO.s.ts --network localhost
async function main() {
  const SuperDAO = await ethers.getContractFactory("SuperDAO");
  const superDAO = await SuperDAO.deploy(
    1, // задержка исполнения в timstamp
    "Token", // название токена для ДАО
    "TKN", // символ токена для ДАО
    "miniDAO", // название ДАО
    5, // _votingDelay - задержка в блоках между созданием предложения и началом голосования
    100, // _votingPeriod - длительность голосования в блоках
    4 // _quorumValue - какой процент должен быть собран для успешного завершения голосования
  );

  console.log(`SuperDAO deployed to ${await superDAO.getAddress()}`);

  const miniDAOAddr = await superDAO.governor();

  const miniDAO = await ethers.getContractAt("MiniDAO", miniDAOAddr);

  const description =
    "Let's repair the stairs on the third floor and paint the ceiling, walls, doors and locks on the same floor?";

  const targets: string[] = ["0x0000000000000000000000000000000000000000"];
  const values: number[] = [0];
  const calldatas: string[] = ["0x00"];

  console.log(await miniDAO.name());

  await miniDAO.propose(targets, values, calldatas, description);

  console.log("Simple vouting created");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
