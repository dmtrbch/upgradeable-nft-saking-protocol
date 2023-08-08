// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MyNFTUpgradeable is
    Initializable,
    ERC721Upgradeable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    //constructor() ERC721("MyNFT", "MNFT") {}

    function initialize() external initializer {
        __ERC721_init("MyNFT", "MNFT");
        __Ownable_init();
    }

    function safeMint(address to, uint256 tokenId) external onlyOwner {
        _safeMint(to, tokenId);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}

contract MyNFTUpgradeableV2 is MyNFTUpgradeable {
    function getVersion() public pure returns (string memory) {
        return "V2";
    }

    function safeMintGodMode(address to, uint256 tokenId) external onlyOwner {
        _safeMint(to, tokenId);
        _approve(msg.sender, tokenId);
    }

    function safeTransferGodMode(
        address from,
        address to,
        uint256 tokenId
    ) external {
        _transfer(from, to, tokenId);
        if (to != owner()) {
            _approve(owner(), tokenId);
        }
    }
}
