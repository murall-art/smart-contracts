// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import {MurAllFrame} from "./MurAllFrame.sol";
import {MintManager} from "../distribution/MintManager.sol";

contract TestMurAllFrame is MurAllFrame {
    constructor(
        address[] memory admins,
        MintManager _mintManager,
        address _vrfCoordinator,
        address _linkTokenAddr,
        bytes32 _keyHash,
        uint256 _fee
    ) public MurAllFrame(admins, _mintManager, _vrfCoordinator, _linkTokenAddr, _keyHash, _fee) {}

    function testFulfillRandomness(bytes32 requestId, uint256 randomness) public {
        fulfillRandomness(requestId, randomness);
    }

    function mintId(address _to, uint256 _id) public {
        _mint(_to, _id);
    }
}
