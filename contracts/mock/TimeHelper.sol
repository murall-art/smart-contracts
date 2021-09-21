// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

contract TimeHelper {
    constructor() public {}

    function blockTimestamp() public view returns (uint256) {
        return block.timestamp;
    }
}
