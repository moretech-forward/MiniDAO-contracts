import { ethers } from "hardhat";

// npx hardhat run scripts/deploySuperDAO.s.ts --network localhost
async function main() {
  const SuperDAO = await ethers.getContractFactory("SuperDAO");
  const superDAO = await SuperDAO.deploy(
    1, // задержка исполнения в timstamp
    "TokenDAO", // название токена для ДАО
    "TKN", // символ токена для ДАО
    "MiniDAO name", // название ДАО
    5, // _votingDelay - задержка в секундах между созданием предложения и началом голосования
    15, // _votingPeriod - длительность голосования в секундах
    4 // _quorumValue - какой процент должен быть собран для успешного завершения голосования
  );

  const ERC721 = await ethers.getContractFactory("MockTokenERC721");
  const erc721 = await ERC721.deploy();

  console.log(`SuperDAO deployed to ${await superDAO.getAddress()}`);
  console.log(`ERC721 deployed to ${await erc721.getAddress()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
