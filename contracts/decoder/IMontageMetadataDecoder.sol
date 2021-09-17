// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

interface IMontageMetadataDecoder {
    function decodeMetadata(bytes memory encodedMetadata)
        external
        view
        returns (
            address creator,
            string memory name,
            string memory description,
            bool canBeUnpacked,
            uint256[] memory tokenIds,
            string memory unlockableContentUri,
            string memory unlockableDescription
        );
}
