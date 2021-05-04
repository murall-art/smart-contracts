// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import {MurAllNFT} from "./MurAllNFT.sol";
import {NftImageDataStorage} from "./storage/NftImageDataStorage.sol";

/**
 * Mock L2 MurAll NFT for testing
 */
contract MockMurAllNFT is MurAllNFT {
    /* TODO Name TBC: I was thinking something to signify its a small piece, like a snippet of art */
    constructor(address[] memory admins, NftImageDataStorage _nftImageDataStorageAddr)
        public
        MurAllNFT(admins, _nftImageDataStorageAddr)
    {}

    function mintTestTokens(uint256 size) public {
        uint256 end = totalSupply() + size;
        for (uint256 i = totalSupply(); i < end; i++) {
            _mint(msg.sender, i);
        }
    }
}
