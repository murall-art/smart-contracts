// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721Holder.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {MurAllNFT} from "./MurAllNFT.sol";
import {SaleItemManager} from "./SaleItemManager.sol";
import {MurAll} from "./MurAll.sol";
import {MurAllBlockList} from "./MurAllBlockList.sol";

contract MurAllMarketplace is Ownable, ERC721Holder, ReentrancyGuard {
    using ERC165Checker for address;
    /*
     *     bytes4(keccak256('balanceOf(address)')) == 0x70a08231
     *     bytes4(keccak256('ownerOf(uint256)')) == 0x6352211e
     *     bytes4(keccak256('approve(address,uint256)')) == 0x095ea7b3
     *     bytes4(keccak256('getApproved(uint256)')) == 0x081812fc
     *     bytes4(keccak256('setApprovalForAll(address,bool)')) == 0xa22cb465
     *     bytes4(keccak256('isApprovedForAll(address,address)')) == 0xe985e9c5
     *     bytes4(keccak256('transferFrom(address,address,uint256)')) == 0x23b872dd
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256)')) == 0x42842e0e
     *     bytes4(keccak256('safeTransferFrom(address,address,uint256,bytes)')) == 0xb88d4fde
     *
     *     => 0x70a08231 ^ 0x6352211e ^ 0x095ea7b3 ^ 0x081812fc ^
     *        0xa22cb465 ^ 0xe985e9c ^ 0x23b872dd ^ 0x42842e0e ^ 0xb88d4fde == 0x80ac58cd
     */
    bytes4 private constant _INTERFACE_ID_ERC721 = 0x80ac58cd;

    /*
     *     bytes4(keccak256('name()')) == 0x06fdde03
     *     bytes4(keccak256('symbol()')) == 0x95d89b41
     *     bytes4(keccak256('tokenURI(uint256)')) == 0xc87b56dd
     *
     *     => 0x06fdde03 ^ 0x95d89b41 ^ 0xc87b56dd == 0x5b5e139f
     */
    bytes4 private constant _INTERFACE_ID_ERC721_METADATA = 0x5b5e139f;

    /*
     *     bytes4(keccak256('totalSupply()')) == 0x18160ddd
     *     bytes4(keccak256('tokenOfOwnerByIndex(address,uint256)')) == 0x2f745c59
     *     bytes4(keccak256('tokenByIndex(uint256)')) == 0x4f6ccce7
     *
     *     => 0x18160ddd ^ 0x2f745c59 ^ 0x4f6ccce7 == 0x780e9d63
     */
    bytes4 private constant _INTERFACE_ID_ERC721_ENUMERABLE = 0x780e9d63;

    uint256 private constant MARKETPLACE_FEE_PERCENT = 3;

    struct Seller {
        address payable sellerAddress;
        uint256 balance;
        bytes32[] saleItemIndex;
        mapping(bytes32 => uint256) saleItemIndexMapping;
    }

    MurAllBlockList public murAllBlockList;
    SaleItemManager public saleItemManager;

    mapping(address => Seller) private sellers;

    mapping(address => bool) public buyers;
    uint256 public totalBuyers;

    event ItemListed(
        uint256 indexed tokenId,
        address indexed contractAddress,
        uint256 price,
        uint256 marketplaceFee,
        bytes32 indexed saleId
    );

    event ItemPriceUpdated(bytes32 indexed saleId, uint256 oldPrice, uint256 newPrice, uint256 marketplaceFee);

    event ItemSold(
        bytes32 indexed saleId,
        uint256 price,
        uint256 marketplaceFee,
        address indexed oldOwner,
        address indexed newOwner
    );

    event ItemQuarantined(uint256 indexed tokenId, uint256 indexed saleId);

    event ItemUnlisted(uint256 indexed tokenId, address contractAddress, bytes32 indexed saleId);

    constructor(MurAllBlockList _murAllBlockListAddr) public {
        murAllBlockList = _murAllBlockListAddr;
        saleItemManager = new SaleItemManager();
    }

    /** @dev Checks if msg.sender is the owner of a listed item
     * @param saleItemId Sale item id to check if msg.sender is the owner
     */
    modifier onlyItemListOwner(bytes32 saleItemId) {
        require(saleItemManager.getSaleItemOwner(saleItemId) == msg.sender, "You do not own the listing");
        _;
    }

    /** @dev Checks if sale item for id exists
     * @param saleItemId Sale item id to check exists in the list of sale items
     */
    modifier onlyItemsForSale(bytes32 saleItemId) {
        require(saleItemManager.itemIsForSale(saleItemId), "Sale id does not match any listing");
        _;
    }

    /** @dev Checks token id is allowed
     * @param tokenId Token id to check exists if blocked
     * @param erc721TokenContractAddress Address of the contract the token belongs to
     */
    modifier onlyAllowedItems(uint256 tokenId, address erc721TokenContractAddress) {
        require(!murAllBlockList.isItemBlocked(tokenId, erc721TokenContractAddress), "The token is blocked");
        _;
    }

    /** @dev Checks if contract is allowed
     * @param erc721TokenContractAddress Address of the contract the token belongs to
     */
    modifier onlyAllowedContracts(address erc721TokenContractAddress) {
        require(!murAllBlockList.isContractBlocked(erc721TokenContractAddress), "The contract is blocked");
        _;
    }

    /** @dev check supports erc721 using eip165
     * @param erc721TokenContractAddress Contract address to check if is ERC721
     */
    modifier onlyERC721(address erc721TokenContractAddress) {
        require(erc721TokenContractAddress.supportsInterface(_INTERFACE_ID_ERC721), "Contract is not ERC721");
        _;
    }

    /** @dev check seller exists
     */
    modifier onlySeller() {
        require(sellers[msg.sender].sellerAddress == msg.sender, "Address is not seller");
        _;
    }

    function listErc721ForSale(
        uint256 tokenId,
        address erc721TokenContractAddress,
        uint256 priceInWei
    )
        public
        nonReentrant
        onlyERC721(erc721TokenContractAddress)
        onlyAllowedItems(tokenId, erc721TokenContractAddress)
        onlyAllowedContracts(erc721TokenContractAddress)
    {
        // require token is not already listed
        bytes32 saleItemId = keccak256(abi.encodePacked(tokenId, erc721TokenContractAddress));
        require(!saleItemManager.itemIsForSale(saleItemId), "Item is already on sale");

        // use contract address to get contract instance as ERC721 instance
        ERC721 erc721TokenContractInstance = ERC721(address(erc721TokenContractAddress));

        // transfer ownership of the token to this contract (will fail if contract is not approved prior to this)
        erc721TokenContractInstance.safeTransferFrom(msg.sender, address(this), tokenId);

        uint256 marketplaceFee = (priceInWei / 100) * MARKETPLACE_FEE_PERCENT;

        // if seller profile does not exist, create one
        if (sellers[msg.sender].sellerAddress == address(0)) {
            sellers[msg.sender] = Seller(payable(msg.sender), 0, new bytes32[](0));
        }

        // update seller sale index list
        insertSaleItemToSellerProfile(saleItemId, msg.sender);

        saleItemManager.insertSaleItem(
            tokenId,
            erc721TokenContractAddress,
            priceInWei,
            payable(msg.sender),
            marketplaceFee
        );

        emit ItemListed(tokenId, erc721TokenContractAddress, priceInWei, marketplaceFee, saleItemId);
    }

    function changeListingPrice(bytes32 saleItemId, uint256 priceInWei)
        public
        nonReentrant
        onlyItemListOwner(saleItemId)
    {
        uint256 marketplaceFee = (priceInWei / 100) * MARKETPLACE_FEE_PERCENT;
        uint256 oldPrice = saleItemManager.getSaleItemPrice(saleItemId);

        saleItemManager.updateSaleItemPrice(saleItemId, priceInWei, marketplaceFee);

        emit ItemPriceUpdated(saleItemId, oldPrice, priceInWei, marketplaceFee);
    }

    function withdrawSaleListing(bytes32 saleItemId)
        public
        nonReentrant
        onlyItemListOwner(saleItemId)
        onlyItemsForSale(saleItemId)
    {
        // get sale item
        uint256 tokenId;
        uint256 price;
        uint256 marketplaceFee;
        address owner;
        address contractAddress;

        (tokenId, price, marketplaceFee, owner, contractAddress) = saleItemManager.getSaleItem(saleItemId);

        // use contract address from sale item to get contract instance
        ERC721 erc721TokenContractInstance = ERC721(address(contractAddress));

        // transfer ownership of the token from this contract to the buyer (will fail if address is not owner)
        // no need for delegate call as the owner of the token should be this contract address
        erc721TokenContractInstance.safeTransferFrom(address(this), msg.sender, tokenId);

        //delete sale item from manager
        saleItemManager.deleteSaleItem(saleItemId);

        // update seller profile
        removeSaleItemFromSellerProfile(saleItemId, msg.sender);

        emit ItemUnlisted(tokenId, contractAddress, saleItemId);
    }

    function purchaseSaleItem(bytes32 saleItemId) public payable nonReentrant onlyItemsForSale(saleItemId) {
        // get sale item
        uint256 tokenId;
        uint256 price;
        uint256 marketplaceFee;
        address owner;
        address contractAddress;

        (tokenId, price, marketplaceFee, owner, contractAddress) = saleItemManager.getSaleItem(saleItemId);

        // Check item is still allowed (might have been blocked)
        require(itemIsAllowed(tokenId, contractAddress), "The token or contract is blocked");

        // use contract address from sale item to get contract instance
        ERC721 erc721TokenContractInstance = ERC721(address(contractAddress));

        // transfer MurAll's cut of the sale to this contract TODO decide on rate/percentage/flat fee/whatever
        uint256 total = marketplaceFee + price;
        require(msg.value >= total, "Not enough ETH provided");

        // increment seller balance by cost of the item
        sellers[owner].balance += (msg.value - marketplaceFee);

        // transfer ownership of the token from this contract to the buyer (will fail if address is not owner)
        // no need for delegate call as the owner of the token should be this contract address
        erc721TokenContractInstance.safeTransferFrom(address(this), msg.sender, tokenId);

        // add address to available list of buyers
        if (!isBuyer(msg.sender)) {
            buyers[msg.sender] = true;
            totalBuyers++;
        }

        //fire the event to say its sold
        emit ItemSold(saleItemId, price, marketplaceFee, owner, msg.sender);

        //delete sale item from manager
        saleItemManager.deleteSaleItem(saleItemId);

        // update seller profile
        removeSaleItemFromSellerProfile(saleItemId, owner);
    }

    function getSellerBalance(address sellerAddress) public view returns (uint256) {
        return sellers[sellerAddress].balance;
    }

    function withdrawSellerBalance() public onlySeller nonReentrant returns (uint256) {
        uint256 balanceAmount = sellers[msg.sender].balance;

        // zero the pending refund before sending to prevent re-entrancy attacks
        sellers[msg.sender].balance = 0;

        // transfer the amount
        (bool success, ) = msg.sender.call.value(balanceAmount)("");
        require(success, "Transfer failed.");
    }

    function isBuyer(address userAddress) public view returns (bool) {
        return buyers[userAddress];
    }

    function totalSaleItems() public view returns (uint256) {
        return saleItemManager.getSaleItemCount();
    }

    function totalSaleItemsForSellerAddress(address sellerAddress) public view returns (uint256) {
        return sellers[sellerAddress].saleItemIndex.length;
    }

    function totalSaleItemsForContractAddress(address erc721TokenContractAddress) public view returns (uint256) {
        return saleItemManager.getSaleItemCountForContractAddress(erc721TokenContractAddress);
    }

    function itemIsForSale(bytes32 saleItemId) public view returns (bool) {
        return saleItemManager.itemIsForSale(saleItemId);
    }

    function itemIsForSale(uint256 tokenId, address erc721TokenContractAddress) public view returns (bool) {
        return saleItemManager.itemIsForSale(tokenId, erc721TokenContractAddress);
    }

    function getItemsForSaleBySellerAddress(address sellerAddress) public view returns (bytes32[] memory) {
        return sellers[sellerAddress].saleItemIndex;
    }

    function getItemAtIndexForSaleBySellerAddress(address sellerAddress, uint256 index)
        public
        view
        returns (bytes32 saleItemId)
    {
        return sellers[sellerAddress].saleItemIndex[index];
    }

    function getItemsForSaleByContractAddress(address erc721TokenContractAddress)
        public
        view
        returns (bytes32[] memory)
    {
        return saleItemManager.getAllSaleItemIdsForContractAddress(erc721TokenContractAddress);
    }

    function getItemAtIndexForSaleByContractAddress(address erc721TokenContractAddress, uint256 index)
        public
        view
        returns (bytes32 saleItemId)
    {
        return saleItemManager.getSaleItemIdAtIndexForContractAddress(erc721TokenContractAddress, index);
    }

    function getSaleItem(bytes32 saleItemId)
        public
        view
        returns (
            uint256 tokenId,
            uint256 price,
            uint256 marketplaceFee,
            address owner,
            address contractAddress
        )
    {
        return saleItemManager.getSaleItem(saleItemId);
    }

    function getAllSaleItemIds() public view returns (bytes32[] memory) {
        return saleItemManager.getAllSaleItemIds();
    }

    function itemIsAllowed(uint256 tokenId, address erc721TokenContractAddress) private view returns (bool) {
        return
            !murAllBlockList.isContractBlocked(erc721TokenContractAddress) &&
            !murAllBlockList.isItemBlocked(tokenId, erc721TokenContractAddress);
    }

    function insertSaleItemToSellerProfile(bytes32 saleItemId, address sellerAddress) private {
        // update sale index list
        sellers[sellerAddress].saleItemIndex.push(saleItemId);
        uint256 _index = sellers[sellerAddress].saleItemIndex.length - 1;
        sellers[sellerAddress].saleItemIndexMapping[saleItemId] = _index;
    }

    function removeSaleItemFromSellerProfile(bytes32 saleItemId, address sellerAddress) private {
        uint256 rowToDelete = sellers[sellerAddress].saleItemIndexMapping[saleItemId];

        bytes32 keyToMove = sellers[sellerAddress].saleItemIndex[sellers[sellerAddress].saleItemIndex.length - 1];
        sellers[sellerAddress].saleItemIndex[rowToDelete] = keyToMove;
        sellers[sellerAddress].saleItemIndexMapping[keyToMove] = rowToDelete;
        sellers[sellerAddress].saleItemIndex.pop();

        delete sellers[sellerAddress].saleItemIndexMapping[saleItemId];
    }

    function isAddressERC721(address erc721TokenContractAddress) public view returns (bool) {
        return erc721TokenContractAddress.supportsInterface(_INTERFACE_ID_ERC721);
    }

    fallback() external payable {}

    receive() external payable {}
}
