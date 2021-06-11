// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import {IMontageMetadataDecoder} from "./IMontageMetadataDecoder.sol";

contract MontageMetadataDecoder is IMontageMetadataDecoder {
    constructor() public {}

    function decodeMetadata(bytes memory encodedMetadata)
        external
        virtual
        override
        view
        returns (
            address creator,
            string memory name,
            string memory description,
            bool canBeUnpacked,
            uint256[] memory tokenIds,
            string memory unlockableContentUri,
            string memory unlockableDescription
        )
    {
        return abi.decode(encodedMetadata, (address, string, string, bool, uint256[], string, string));
    }
}
