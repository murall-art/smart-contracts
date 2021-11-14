// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import {TraitSeedManager} from "./TraitSeedManager.sol";

contract TestTraitSeedManager is TraitSeedManager {
    constructor(
        address[] memory admins,
        address _vrfCoordinator,
        address _linkTokenAddr,
        bytes32 _keyHash,
        uint256 _fee,
        uint256 _rangeSize,
        uint256 _rangeStart
    ) public TraitSeedManager(admins, _vrfCoordinator, _linkTokenAddr, _keyHash, _fee, _rangeSize, _rangeStart) {}

    function testFulfillRandomness(bytes32 requestId, uint256 randomness) public {
        fulfillRandomness(requestId, randomness);
    }

    function getTraitSeedAt(uint256 index) public view returns (uint256) {
        return traitSeeds[index];
    }
}
