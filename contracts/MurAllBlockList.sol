pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";


contract MurAllBlockList is Ownable {
    struct BlockedArtworks {
        address contractAddress;
        uint256 totalBlockedItemsForContract;
        bool blocked;
        mapping(uint256 => bool) blockedTokenIds;
    }

    mapping(address => BlockedArtworks) public blockedItemsByContractAddress;
    uint256 public totalBlockedItems;
    uint256 public totalBlockedContracts;

    event ArtworkBlocked(uint256 indexed tokenId, address indexed contractAddress);
    event ContractBlocked(address indexed contractAddress);

    constructor() public {}

    function addTokenToBlockList(uint256 tokenId, address contractAddress) public onlyOwner {
        if (!isItemBlocked(tokenId, contractAddress)) {
            // create if does not exist
            if (blockedItemsByContractAddress[contractAddress].contractAddress == address(0)) {
                blockedItemsByContractAddress[contractAddress] = BlockedArtworks({
                    contractAddress: contractAddress,
                    totalBlockedItemsForContract: 0,
                    blocked: false
                });
            }
            // fetch blocked list for contract
            BlockedArtworks storage artworks = blockedItemsByContractAddress[contractAddress];

            // set token id blocked
            artworks.blockedTokenIds[tokenId] = true;
            artworks.totalBlockedItemsForContract++;

            // store change
            blockedItemsByContractAddress[contractAddress] = artworks;
            totalBlockedItems++;

            // Notify artwork has been blocked
            emit ArtworkBlocked(tokenId, contractAddress);
        }
    }

    function addContractToBlockList(address contractAddress) public onlyOwner {
        if (!isContractBlocked(contractAddress)) {
            // create if does not exist
            if (blockedItemsByContractAddress[contractAddress].contractAddress == address(0)) {
                blockedItemsByContractAddress[contractAddress] = BlockedArtworks({
                    contractAddress: contractAddress,
                    totalBlockedItemsForContract: 0,
                    blocked: true
                });
            } else {
                // fetch blocked list for contract
                BlockedArtworks storage artworks = blockedItemsByContractAddress[contractAddress];

                // set contract blocked
                artworks.blocked = true;

                // store change
                blockedItemsByContractAddress[contractAddress] = artworks;
            }

            totalBlockedContracts++;

            // Notify contract has been blocked
            emit ContractBlocked(contractAddress);
        }
    }

    function isItemBlocked(uint256 tokenId, address contractAddress) public view returns (bool) {
        return blockedItemsByContractAddress[contractAddress].blockedTokenIds[tokenId];
    }

    function isContractBlocked(address contractAddress) public view returns (bool) {
        return blockedItemsByContractAddress[contractAddress].blocked;
    }
}
