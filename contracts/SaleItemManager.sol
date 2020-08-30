pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract SaleItemManager is Ownable, ReentrancyGuard {
    struct SaleItem {
        uint256 tokenId;
        uint256 price;
        uint256 marketplaceFee;
        address payable owner;
        address contractAddress;
        uint256 index;
    }

    struct SaleItemsByContractAddress {
        address contractAddress;
        bytes32[] saleItemIndex;
        mapping(bytes32 => uint256) saleItemIndexMapping;
    }

    mapping(address => SaleItemsByContractAddress) private saleItemsByContract;

    mapping(bytes32 => SaleItem) private saleItems;
    bytes32[] private saleItemIndex;

    event SaleItemInserted(
        uint256 indexed tokenId,
        address contractAddress,
        address indexed tokenOwner,
        uint256 price,
        uint256 marketplaceFee,
        bytes32 indexed saleId
    );
    event SaleItemDeleted(uint256 indexed tokenId, address contractAddress, bytes32 indexed saleId);
    event SaleItemPriceUpdated(bytes32 indexed saleId, uint256 oldPrice, uint256 newPrice, uint256 marketplaceFee);

    /** @dev Checks if sale item for id exists
     * @param saleItemId Sale item id to check exists in the list of sale items
     */
    modifier onlyItemsForSale(bytes32 saleItemId) {
        require((saleItemIndex[saleItems[saleItemId].index] == saleItemId), "Sale id does not match any listing");
        _;
    }

    constructor() public {}

    function itemIsForSale(uint256 tokenId, address erc721TokenContractAddress) public view returns (bool) {
        bytes32 saleItemId = keccak256(abi.encodePacked(tokenId, erc721TokenContractAddress));
        return itemIsForSale(saleItemId);
    }

    function itemIsForSale(bytes32 saleItemId) public view returns (bool) {
        if (saleItemIndex.length == 0) return false;
        return (saleItemIndex[saleItems[saleItemId].index] == saleItemId);
    }

    function insertSaleItem(
        uint256 tokenId,
        address erc721TokenContractAddress,
        uint256 priceInWei,
        address payable tokenOwner,
        uint256 marketplaceFee
    ) public nonReentrant onlyOwner returns (uint256) {
        // require token is not already listed
        bytes32 saleItemId = keccak256(abi.encodePacked(tokenId, erc721TokenContractAddress));
        require(!itemIsForSale(saleItemId), "Item is already on sale");

        // update sale index list
        saleItemIndex.push(saleItemId);
        uint256 _index = saleItemIndex.length - 1;

        // add sale item to internal list
        SaleItem memory _saleItem = SaleItem(
            tokenId,
            priceInWei,
            marketplaceFee,
            tokenOwner,
            erc721TokenContractAddress,
            _index
        );

        // push the sale item to the mapping
        saleItems[saleItemId] = _saleItem;

        insertSaleItemToSaleItemsByContract(saleItemId, erc721TokenContractAddress);

        //fire the event to say its inserted
        emit SaleItemInserted(tokenId, erc721TokenContractAddress, tokenOwner, priceInWei, marketplaceFee, saleItemId);

        return _index;
    }

    function deleteSaleItem(bytes32 saleItemId)
        public
        nonReentrant
        onlyOwner
        onlyItemsForSale(saleItemId)
        returns (uint256)
    {
        uint256 rowToDelete = saleItems[saleItemId].index;

        uint256 tokenId = saleItems[saleItemId].tokenId;
        address contractAddress = saleItems[saleItemId].contractAddress;

        bytes32 keyToMove = saleItemIndex[saleItemIndex.length - 1];
        saleItemIndex[rowToDelete] = keyToMove;
        saleItems[keyToMove].index = rowToDelete;
        saleItemIndex.pop();
        removeSaleItemFromSaleItemsByContract(saleItemId, contractAddress);
        emit SaleItemDeleted(tokenId, contractAddress, saleItemId);
        delete saleItems[saleItemId];
        return rowToDelete;
    }

    function updateSaleItemPrice(
        bytes32 saleItemId,
        uint256 priceInWei,
        uint256 marketplaceFee
    ) public nonReentrant onlyOwner onlyItemsForSale(saleItemId) returns (bool success) {
        // get sale item
        SaleItem storage _saleItem = saleItems[saleItemId];

        uint256 oldPrice = _saleItem.price;

        _saleItem.price = priceInWei;
        _saleItem.marketplaceFee = marketplaceFee;

        emit SaleItemPriceUpdated(saleItemId, oldPrice, priceInWei, marketplaceFee);

        return true;
    }

    function getSaleItem(bytes32 saleItemId)
        public
        view
        onlyItemsForSale(saleItemId)
        returns (
            uint256 tokenId,
            uint256 price,
            uint256 marketplaceFee,
            address owner,
            address contractAddress
        )
    {
        SaleItem memory saleItem = saleItems[saleItemId];
        return (saleItem.tokenId, saleItem.price, saleItem.marketplaceFee, saleItem.owner, saleItem.contractAddress);
    }

    function getSaleItemOwner(bytes32 saleItemId) public view onlyItemsForSale(saleItemId) returns (address owner) {
        return saleItems[saleItemId].owner;
    }

    function getSaleItemPrice(bytes32 saleItemId) public view onlyItemsForSale(saleItemId) returns (uint256 price) {
        return saleItems[saleItemId].price;
    }

    function getSaleItemContractAddress(bytes32 saleItemId)
        public
        view
        onlyItemsForSale(saleItemId)
        returns (address contractAddress)
    {
        return saleItems[saleItemId].contractAddress;
    }

    function getSaleItemCount() public view returns (uint256 count) {
        return saleItemIndex.length;
    }

    function getSaleItemIdAtIndex(uint256 index) public view returns (bytes32 saleItemId) {
        return saleItemIndex[index];
    }

    function getAllSaleItemIds() public view returns (bytes32[] memory) {
        return saleItemIndex;
    }

    function getSaleItemCountForContractAddress(address contractAddress) public view returns (uint256 count) {
        return saleItemsByContract[contractAddress].saleItemIndex.length;
    }

    function getSaleItemIdAtIndexForContractAddress(address contractAddress, uint256 index)
        public
        view
        returns (bytes32 saleItemId)
    {
        return saleItemsByContract[contractAddress].saleItemIndex[index];
    }

    function getAllSaleItemIdsForContractAddress(address contractAddress) public view returns (bytes32[] memory) {
        return saleItemsByContract[contractAddress].saleItemIndex;
    }

    function insertSaleItemToSaleItemsByContract(bytes32 saleItemId, address contractAddress) private {
        // if contract marketplace does not exist, create one
        if (saleItemsByContract[contractAddress].contractAddress == address(0)) {
            saleItemsByContract[contractAddress] = SaleItemsByContractAddress(contractAddress, new bytes32[](0));
        }

        // update sale index list
        saleItemsByContract[contractAddress].saleItemIndex.push(saleItemId);
        uint256 _index = saleItemsByContract[contractAddress].saleItemIndex.length - 1;
        saleItemsByContract[contractAddress].saleItemIndexMapping[saleItemId] = _index;
    }

    function removeSaleItemFromSaleItemsByContract(bytes32 saleItemId, address contractAddress) private {
        uint256 rowToDelete = saleItemsByContract[contractAddress].saleItemIndexMapping[saleItemId];

        bytes32 keyToMove = saleItemsByContract[contractAddress].saleItemIndex[saleItemsByContract[contractAddress]
            .saleItemIndex
            .length - 1];
        saleItemsByContract[contractAddress].saleItemIndex[rowToDelete] = keyToMove;
        saleItemsByContract[contractAddress].saleItemIndexMapping[keyToMove] = rowToDelete;
        saleItemsByContract[contractAddress].saleItemIndex.pop();

        delete saleItemsByContract[contractAddress].saleItemIndexMapping[saleItemId];
    }
}
