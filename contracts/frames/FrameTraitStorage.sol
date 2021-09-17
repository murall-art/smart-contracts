// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {FxBaseRootTunnel} from "../polygon/FxBaseRootTunnel.sol";

/**
 * MurAll Frame trait storage contract, with L2 communication via FxBaseRootTunnel.
 */
contract FrameTraitStorage is Ownable, AccessControl, ReentrancyGuard, FxBaseRootTunnel {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    using Strings for uint256;

    uint256[] frameTraits;
    address public murallFrameContractAddress;

    event FrameTraitsUpdated(uint256 indexed id, uint256 traits);

    /** @dev Checks if sender address has admin role
     */
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Does not have admin role");
        _;
    }

    constructor(
        address[] memory admins,
        address _checkpointManager,
        address _fxRoot
    ) public FxBaseRootTunnel(_checkpointManager, _fxRoot) {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }
    }

    function rescueTokens(address tokenAddress) public onlyAdmin {
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        require(IERC20(tokenAddress).transfer(msg.sender, balance), "MurAllFrame: Transfer failed.");
    }

    function _processMessageFromChild(bytes memory data) internal override {
        // TODO process data from L2
        uint256[] memory latestData = abi.decode(data, (uint256[]));
        for (uint256 i = 0; i < latestData.length; ++i) {
            frameTraits.push(latestData[i]);
        }
    }

    function getTotalTraits() public view returns (uint256) {
        return frameTraits.length;
    }

    function getTraits(uint256 id) public view returns (uint256) {
        return frameTraits[id];
    }

    function sendMessageToChild(bytes memory message) public onlyAdmin {
        _sendMessageToChild(message);
    }

    function addInitialTrait(uint256 traits) public {
        require(msg.sender == murallFrameContractAddress, "Only the frame contract can add traits");
        frameTraits.push(traits);
    }

    function setFrameContract(address _frameContract) public onlyAdmin {
        require(_frameContract != address(murallFrameContractAddress), "Frame contract already set");
        require(_frameContract != address(this), "Frame contract cannot be set to itself");
        require(_frameContract != address(msg.sender), "Frame contract cannot be set to sender");
        require(_frameContract != address(0), "Frame contract cannot be 0 address");

        murallFrameContractAddress = _frameContract;
    }
}
