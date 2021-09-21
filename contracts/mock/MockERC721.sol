// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";

/**
 * Mock ERC721 NFT for testing
 */
contract MockERC721 is ERC721 {
    constructor(string memory name, string memory symbol) public ERC721(name, symbol) {}

    function mintTestTokens(uint256 size) public {
        uint256 end = totalSupply() + size;
        for (uint256 i = totalSupply(); i < end; i++) {
            _mint(msg.sender, i);
        }
    }

    function mintTokenForId(uint256 _id) public {
        _mint(msg.sender, _id);
    }
}
