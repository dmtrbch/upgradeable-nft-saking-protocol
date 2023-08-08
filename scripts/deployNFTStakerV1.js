// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// You can also run a script with `npx hardhat run <script>`. If you do that, Hardhat
// will compile your contracts, add the Hardhat Runtime Environment's members to the
// global scope, and execute the script.
const { ethers, upgrades } = require("hardhat");

const TOKEN_PROXY_ADDRESS = "0x4E91D067747f93e0421DB06978f9deb42fC69914";
const NFT_PROXY_ADDRESS = "0xE8FC5DDCd1866790a5dC9beC80A56936B857Fe1A";

async function main() {
  const NFTStakerUpgradeable = await ethers.getContractFactory(
    "NFTStakerUpgradeable"
  );

  const nftStaker = await upgrades.deployProxy(
    NFTStakerUpgradeable,
    [TOKEN_PROXY_ADDRESS, NFT_PROXY_ADDRESS],
    {
      initializer: "initialize",
      kind: "uups",
    }
  );
  await nftStaker.waitForDeployment();

  console.log("NFTStaker deployed to:", await nftStaker.getAddress());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
