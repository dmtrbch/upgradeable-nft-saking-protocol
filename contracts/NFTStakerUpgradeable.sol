// SPDX-License-Identifier: MIT
pragma solidity 0.8.19;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/IERC721ReceiverUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "./MyTokenUpgradeable.sol";

contract NFTStakerUpgradeable is
    Initializable,
    UUPSUpgradeable,
    OwnableUpgradeable,
    IERC721ReceiverUpgradeable
{
    uint256 private constant TOKENS_PER_NFT = 10;
    uint256 private constant REWARD_PERIOD = 1 days;

    MyTokenUpgradeable private myTokenContract;
    IERC721Upgradeable private myNFTContract;

    struct StakeData {
        uint256 stakedTimestamp;
        uint256 tokenId;
    }

    mapping(uint256 => address) public originalOwner;
    mapping(address => StakeData[]) private stakers;
    mapping(address => uint256) public userRewards;
    mapping(address => uint256) public lastClaim;

    /* constructor(address _tokenAddress, IERC721 _NFTAddress) {
        myTokenContract = MyToken(_tokenAddress);
        myNFTContract = _NFTAddress;
    } */

    function initialize(
        address _tokenAddress,
        IERC721Upgradeable _NFTAddress
    ) external initializer {
        __Ownable_init();
        myTokenContract = MyTokenUpgradeable(_tokenAddress);
        myNFTContract = _NFTAddress;
    }

    function onERC721Received(
        address operator,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external override returns (bytes4) {
        originalOwner[tokenId] = from;
        StakeData[] storage st = stakers[from];
        st.push(StakeData(block.timestamp, tokenId));
        return IERC721ReceiverUpgradeable.onERC721Received.selector;
    }

    function withdrawNFT(uint256 tokenId) external {
        require(
            originalOwner[tokenId] == msg.sender,
            "You're not owner of this NFT"
        );

        StakeData[] storage st = stakers[msg.sender];

        uint256 tokenRewardsForUnstakedNFT;

        for (uint256 i = 0; i < st.length; i++) {
            if (tokenId == st[i].tokenId) {
                tokenRewardsForUnstakedNFT = _calculateTokenRewards(
                    lastClaim[msg.sender],
                    st[i].stakedTimestamp,
                    block.timestamp
                );
                break;
            }
        }

        userRewards[msg.sender] += tokenRewardsForUnstakedNFT;

        _removeNFTFromStaker(st, tokenId);
        myNFTContract.safeTransferFrom(address(this), msg.sender, tokenId);
    }

    function claimRewards() external {
        _withdrawTokens(msg.sender);
    }

    function _withdrawTokens(address _to) internal {
        require(
            (block.timestamp - lastClaim[_to]) >= REWARD_PERIOD,
            "You can claim rewards once in 24 hours"
        );

        uint256 rewards = calculateRewards(_to);
        require(rewards > 0, "No rewards for claiming");

        lastClaim[_to] = block.timestamp;
        userRewards[_to] = 0;
        myTokenContract.mintTokens(_to, rewards);
    }

    function totalStakedBy(address _staker) public view returns (uint256) {
        return stakers[_staker].length;
    }

    function nftsOfStaker(
        address _staker
    ) public view returns (uint256[] memory) {
        StakeData[] memory st = stakers[_staker];
        uint256[] memory tokenIds = new uint256[](st.length);

        for (uint256 i = 0; i < st.length; i++) {
            tokenIds[i] = st[i].tokenId;
        }
        return tokenIds;
    }

    function _removeNFTFromStaker(
        StakeData[] storage st,
        uint256 _tokenId
    ) internal {
        for (uint256 i = 0; i < st.length; i++) {
            if (_tokenId == st[i].tokenId) {
                st[i] = st[st.length - 1];
                st.pop();
                break;
            }
        }
    }

    function calculateRewards(address _staker) public view returns (uint256) {
        uint256 tokenRewards;
        tokenRewards = _calculateRewards(stakers[_staker], lastClaim[_staker]);
        tokenRewards += userRewards[_staker];
        return tokenRewards;
    }

    function _calculateRewards(
        StakeData[] memory st,
        uint256 _lastClaim
    ) internal view returns (uint256) {
        uint256 result;
        uint256 stakerBalance = st.length;
        for (uint256 i = 0; i < stakerBalance; i++) {
            result += _calculateTokenRewards(
                _lastClaim,
                st[i].stakedTimestamp,
                block.timestamp
            );
        }
        return result;
    }

    function _calculateTokenRewards(
        uint256 _lastClaimedTimestamp,
        uint256 _stakedTimestamp,
        uint256 _currentTimestamp
    ) internal pure returns (uint256 tokenRewards) {
        _lastClaimedTimestamp = _lastClaimedTimestamp < _stakedTimestamp
            ? _stakedTimestamp
            : _lastClaimedTimestamp;
        uint256 unclaimedTime = _currentTimestamp - _lastClaimedTimestamp;
        tokenRewards = (unclaimedTime * TOKENS_PER_NFT) / REWARD_PERIOD;
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
