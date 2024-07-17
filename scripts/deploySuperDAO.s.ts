import { ethers } from "hardhat";

// npx hardhat run scripts/deploySuperDAO.s.ts --network localhost
async function main() {
  const SuperDAO = await ethers.getContractFactory("SuperDAO");
  const superDAO = await SuperDAO.deploy(
    1, // задержка исполнения в timstamp
    "TokenDAO", // название токена для ДАО
    "TKN", // символ токена для ДАО
    "MiniDAO name", // название ДАО
    50, // _votingDelay - задержка в секундах между созданием предложения и началом голосования
    100, // _votingPeriod - длительность голосования в секундах
    4 // _quorumValue - какой процент должен быть собран для успешного завершения голосования
  );

  console.log(`SuperDAO deployed to ${await superDAO.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
