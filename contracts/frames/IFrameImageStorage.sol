// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

interface IFrameImageStorage {
    function getImageForTraitData(
        bytes32 traitHash
    ) external view returns (string memory);
}
