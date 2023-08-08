// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers, upgrades } = require("hardhat");

const NFT_PROXY_ADDRESS = "0xE8FC5DDCd1866790a5dC9beC80A56936B857Fe1A";

async function main() {
  const MyNFTUpgradeableV2 = await ethers.getContractFactory(
    "MyNFTUpgradeableV2"
  );

  const nftV2 = await upgrades.upgradeProxy(
    NFT_PROXY_ADDRESS,
    MyNFTUpgradeableV2
  );

  console.log(`MyNFT upgraded to version ${await nftV2.getVersion()}`);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
