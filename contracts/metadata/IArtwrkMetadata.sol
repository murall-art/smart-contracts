// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

interface IArtwrkMetadata {
    function getArtwrkMetadata(uint256 _tokenId) external view returns (string memory metadata);
}
