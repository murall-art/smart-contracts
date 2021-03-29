// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import {IMetadataDecoder} from "./IMetadataDecoder.sol";

contract MetadataDecoder is IMetadataDecoder {
    constructor() public {}

    function decodeMetadata(bytes memory encodedMetadata)
        external
        virtual
        override
        view
        returns (
            bytes32 dataHash,
            address artist,
            uint256 name,
            uint256 metadata
        )
    {
        return abi.decode(encodedMetadata, (bytes32, address, uint256, uint256));
    }
}
