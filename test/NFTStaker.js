const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

/* function revertReason(reason) {
  return `VM Exception while processing transaction: reverted with reason string '${reason}'`;
} */

describe("NFT Staker", function () {
  let myTokenContract = null;
  let myNftContract = null;
  let nftStakerContract = null;
  let provider = null;
  let accounts = null;
  const DEFAULT_USER = 0;
  const FIRST_USER_ID = 1;
  const ATTACKER_ID = 9;
  const TOKENS_PER_NFT = 10;
  const SECONDS_IN_DAY = 86400;

  beforeEach(async function () {
    const MyTokenContractFactory = await ethers.getContractFactory(
      "MyTokenUpgradeable"
    );
    myTokenContract = await upgrades.deployProxy(MyTokenContractFactory, {
      kind: "uups",
    });
    await myTokenContract.waitForDeployment();

    const MyNftContractFactory = await ethers.getContractFactory(
      "MyNFTUpgradeable"
    );
    myNftContract = await upgrades.deployProxy(MyNftContractFactory, {
      kind: "uups",
    });
    await myNftContract.waitForDeployment();

    const MY_CONTRACT_ADDRESS = await myTokenContract.getAddress();
    const MY_NFT_ADDRESS = await myNftContract.getAddress();

    const NftStakerFactory = await ethers.getContractFactory(
      "NFTStakerUpgradeable"
    );
    nftStakerContract = await upgrades.deployProxy(
      NftStakerFactory,
      [MY_CONTRACT_ADDRESS, MY_NFT_ADDRESS],
      {
        initializer: "initialize",
        kind: "uups",
      }
    );
    await nftStakerContract.waitForDeployment();

    const MyNftContractFactoryV2 = await ethers.getContractFactory(
      "MyNFTUpgradeableV2"
    );
    const myNftContractV2 = await upgrades.upgradeProxy(
      MY_NFT_ADDRESS,
      MyNftContractFactoryV2
    );

    provider = await ethers.provider;
    accounts = await ethers.getSigners();
  });

  describe("MyToken: mintTokens", async function () {
    it("should allow the owner of the contract to mint tokens", async function () {
      const tokensAmount = 300;

      await expect(
        myTokenContract.mintTokens(
          accounts[FIRST_USER_ID].address,
          tokensAmount
        )
      ).to.not.be.reverted;

      expect(
        await myTokenContract.balanceOf(accounts[FIRST_USER_ID].address)
      ).to.be.equal(BigInt(ethers.parseEther(tokensAmount.toString())));
    });

    it("should revert the transaction if the account that tries to mint tokens is not the owner", async function () {
      const tokensAmount = 300;

      await expect(
        myTokenContract
          .connect(accounts[ATTACKER_ID])
          .mintTokens(accounts[FIRST_USER_ID].address, tokensAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("MyNft: safeMint", async function () {
    it("should allow the owner of the contract to mint NFT", async function () {
      const tokenId = 1;

      await expect(
        myNftContract.safeMint(accounts[FIRST_USER_ID].address, tokenId)
      ).to.not.be.reverted;

      expect(await myNftContract.ownerOf(tokenId))
        .to.be.a("string")
        .equal(accounts[FIRST_USER_ID].address);
    });

    it("should revert the transaction if the account that tries to mint the NFT is not the owner", async function () {
      const tokenId = 2;

      await expect(
        myNftContract
          .connect(accounts[ATTACKER_ID])
          .safeMint(accounts[FIRST_USER_ID].address, tokenId)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("NftStaker: onERC721Received (staking NFT)", async function () {
    it("should allow depositing NFT to the staking contract", async function () {
      const tokenId = 1;

      const NFT_STAKER_ADDRESS = await nftStakerContract.getAddress();

      const mintNftTx = await myNftContract.safeMint(
        accounts[DEFAULT_USER].address,
        tokenId
      );
      await mintNftTx.wait();

      const transferNftTx = await myNftContract[
        "safeTransferFrom(address,address,uint256)"
      ](accounts[DEFAULT_USER].address, NFT_STAKER_ADDRESS, tokenId);
      await transferNftTx.wait();

      expect(await myNftContract.ownerOf(tokenId))
        .to.be.a("string")
        .equal(NFT_STAKER_ADDRESS);
    });
    it("should set the originalOwner inside NFtStaker.sol equal to the account that is transfering the NFT", async function () {
      const tokenId = 1;

      const NFT_STAKER_ADDRESS = await nftStakerContract.getAddress();

      const mintNftTx = await myNftContract.safeMint(
        accounts[DEFAULT_USER].address,
        tokenId
      );
      await mintNftTx.wait();

      const transferNftTx = await myNftContract[
        "safeTransferFrom(address,address,uint256)"
      ](accounts[DEFAULT_USER].address, NFT_STAKER_ADDRESS, tokenId);
      await transferNftTx.wait();

      expect(await nftStakerContract.originalOwner(tokenId))
        .to.be.a("string")
        .equal(accounts[DEFAULT_USER].address);
    });
  });

  describe("NftStaker: withdrawNFT (unstaking NFT)", async function () {
    it("should allow user to withdraw/unstake NFT from the staking contract", async function () {
      const tokenId = 1;

      const NFT_STAKER_ADDRESS = await nftStakerContract.getAddress();

      const mintNftTx = await myNftContract.safeMint(
        accounts[DEFAULT_USER].address,
        tokenId
      );
      await mintNftTx.wait();

      const transferNftTx = await myNftContract[
        "safeTransferFrom(address,address,uint256)"
      ](accounts[DEFAULT_USER].address, NFT_STAKER_ADDRESS, tokenId);
      await transferNftTx.wait();

      await expect(nftStakerContract.withdrawNFT(tokenId)).to.not.be.reverted;

      expect(await myNftContract.ownerOf(tokenId))
        .to.be.a("string")
        .equal(accounts[DEFAULT_USER].address);
    });

    it("should revert the transaction if the account that tries to withdraw the NFT is not original owner of the NFT", async function () {
      const tokenId = 1;

      const NFT_STAKER_ADDRESS = await nftStakerContract.getAddress();

      const mintNftTx = await myNftContract.safeMint(
        accounts[DEFAULT_USER].address,
        tokenId
      );
      await mintNftTx.wait();

      const transferNftTx = await myNftContract[
        "safeTransferFrom(address,address,uint256)"
      ](accounts[DEFAULT_USER].address, NFT_STAKER_ADDRESS, tokenId);
      await transferNftTx.wait();

      await expect(
        nftStakerContract.connect(accounts[ATTACKER_ID]).withdrawNFT(tokenId)
      ).to.be.revertedWith("You're not owner of this NFT");
    });

    it("should calculate rewards in 24 hours for the withdrawn NFT and save it to userRewards mapping", async function () {
      const tokenId = 1;

      const NFT_STAKER_ADDRESS = await nftStakerContract.getAddress();

      const currentDate = Math.floor(new Date().getTime() / 1000);
      const dateAfterOneDay =
        Math.floor(new Date().getTime() / 1000) + SECONDS_IN_DAY;

      const mintNftTx = await myNftContract.safeMint(
        accounts[DEFAULT_USER].address,
        tokenId
      );
      await mintNftTx.wait();

      const transferNftTx = await myNftContract[
        "safeTransferFrom(address,address,uint256)"
      ](accounts[DEFAULT_USER].address, NFT_STAKER_ADDRESS, tokenId);
      await transferNftTx.wait();

      const aproximateRewards =
        ((dateAfterOneDay - currentDate) * TOKENS_PER_NFT) / SECONDS_IN_DAY;

      await provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);

      await expect(nftStakerContract.withdrawNFT(tokenId)).to.not.be.reverted;

      expect(
        await nftStakerContract.userRewards(accounts[DEFAULT_USER].address)
      ).to.be.equal(BigInt(aproximateRewards.toString()));
    });
  });

  describe("NftStaker: claimRewards (unstaking NFT)", async function () {
    it("should revert if user tries to claim rewards in less than 24 hours - recurring", async function () {
      const NFT_STAKER_ADDRESS = await nftStakerContract.getAddress();

      const tx = await myTokenContract.transferOwnership(NFT_STAKER_ADDRESS);
      await tx.wait();

      const tokenId = 1;

      const mintNftTx = await myNftContract.safeMint(
        accounts[DEFAULT_USER].address,
        tokenId
      );
      await mintNftTx.wait();

      const transferNftTx = await myNftContract.safeTransferFrom(
        accounts[DEFAULT_USER].address,
        NFT_STAKER_ADDRESS,
        tokenId
      );
      await transferNftTx.wait();

      await provider.send("evm_increaseTime", [12 * 60 * 60 + 1]);

      await expect(nftStakerContract.claimRewards()).to.not.be.reverted;

      await provider.send("evm_increaseTime", [2 * 60 * 60 + 1]);

      await expect(nftStakerContract.claimRewards()).to.be.revertedWith(
        "You can claim rewards once in 24 hours"
      );
    });

    it("should revert if user has no rewards", async function () {
      const NFT_STAKER_ADDRESS = await nftStakerContract.getAddress();

      const tx = await myTokenContract.transferOwnership(NFT_STAKER_ADDRESS);
      await tx.wait();

      const tokenId = 1;

      const mintNftTx = await myNftContract.safeMint(
        accounts[DEFAULT_USER].address,
        tokenId
      );
      await mintNftTx.wait();

      await expect(nftStakerContract.claimRewards()).to.be.revertedWith(
        "No rewards for claiming"
      );
    });

    it("should allow the user to claim rewards", async function () {
      const NFT_STAKER_ADDRESS = await nftStakerContract.getAddress();

      const tx = await myTokenContract.transferOwnership(NFT_STAKER_ADDRESS);
      await tx.wait();

      const tokenId = 1;

      const currentDate = Math.floor(new Date().getTime() / 1000);
      const dateAfterOneDay =
        Math.floor(new Date().getTime() / 1000) + SECONDS_IN_DAY;

      const aproximateRewards =
        ((dateAfterOneDay - currentDate) * TOKENS_PER_NFT) / SECONDS_IN_DAY;

      const mintNftTx = await myNftContract.safeMint(
        accounts[DEFAULT_USER].address,
        tokenId
      );
      await mintNftTx.wait();

      const transferNftTx = await myNftContract[
        "safeTransferFrom(address,address,uint256)"
      ](accounts[DEFAULT_USER].address, NFT_STAKER_ADDRESS, tokenId);
      await transferNftTx.wait();

      await provider.send("evm_increaseTime", [24 * 60 * 60 + 1]);

      await expect(nftStakerContract.claimRewards()).to.not.be.reverted;

      expect(
        await myTokenContract.balanceOf(accounts[DEFAULT_USER].address)
      ).to.be.equal(
        BigInt(ethers.parseUnits(aproximateRewards.toString(), "ether"))
      );
    });
  });

  describe("NftStaker: totalStakedBy", async function () {
    it("should return to total amount of NFTs staked for a particualr user", async function () {
      let tokenId = 1;

      const NFT_STAKER_ADDRESS = await nftStakerContract.getAddress();

      for (let i = 0; i < 3; i++) {
        const mintNftTx = await myNftContract.safeMint(
          accounts[DEFAULT_USER].address,
          tokenId
        );
        await mintNftTx.wait();

        const transferNftTx = await myNftContract[
          "safeTransferFrom(address,address,uint256)"
        ](accounts[DEFAULT_USER].address, NFT_STAKER_ADDRESS, tokenId);
        await transferNftTx.wait();

        tokenId++;
      }

      expect(
        await nftStakerContract.totalStakedBy(accounts[DEFAULT_USER].address)
      ).to.be.equal(BigInt(3));
    });
  });

  describe("NftStaker: nftsOfStaker", async function () {
    it("should return array with the tokenIds corresponding to the NFTs that are staked for a particualr user", async function () {
      const tokenIds = [1, 2, 3];

      const NFT_STAKER_ADDRESS = await nftStakerContract.getAddress();

      for (let i = 0; i < 3; i++) {
        const mintNftTx = await myNftContract.safeMint(
          accounts[DEFAULT_USER].address,
          tokenIds[i]
        );
        await mintNftTx.wait();

        const transferNftTx = await myNftContract[
          "safeTransferFrom(address,address,uint256)"
        ](accounts[DEFAULT_USER].address, NFT_STAKER_ADDRESS, tokenIds[i]);
        await transferNftTx.wait();
      }

      expect(
        await nftStakerContract.nftsOfStaker(accounts[DEFAULT_USER].address)
      ).to.be.eql([BigInt(1), BigInt(2), BigInt(3)]);
    });
  });
});
