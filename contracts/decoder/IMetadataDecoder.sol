// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

interface IMetadataDecoder {
    function decodeMetadata(bytes memory encodedMetadata)
        external
        view
        returns (
            bytes32 dataHash,
            address artist,
            uint256 name,
            uint256 metadata
        );
}
