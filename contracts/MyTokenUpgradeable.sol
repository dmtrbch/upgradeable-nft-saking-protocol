// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

contract MyTokenUpgradeable is
    Initializable,
    ERC20Upgradeable,
    UUPSUpgradeable,
    OwnableUpgradeable
{
    // constructor() ERC20("MyToken", "MTK") {}

    function initialize() external initializer {
        __ERC20_init("MyToken", "MTK");
        __Ownable_init();
    }

    function mintTokens(address _to, uint256 _amount) public onlyOwner {
        _mint(_to, _amount * 10 ** 18);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
