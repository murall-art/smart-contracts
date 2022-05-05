// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/introspection/ERC165Checker.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IERC2981} from "../royalties/IERC2981.sol";
import {IRoyaltyGovernor} from "../royalties/IRoyaltyGovernor.sol";
import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";
import {MintManager} from "../distribution/MintManager.sol";
import {PaintToken} from "../PaintToken.sol";

/**
 * Boring Security Grid NFT contract
 */
contract GridNFT is AccessControl, ReentrancyGuard, IERC2981, ERC721 {
    bytes32 private constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 private constant TRAIT_MOD_ROLE = keccak256("TRAIT_MOD_ROLE");

    using Strings for uint256;
    using ERC165Checker for address;

    uint64 public immutable MAX_SUPPLY = 60;

    PaintToken public paintToken;

    MintManager public mintManager;
    IRoyaltyGovernor public royaltyGovernorContract;

    string public contractURI;

    struct GridContents {
        uint256[] blockNumbers;
    }

    uint256 public constant PRICE_PER_PIXEL = 500000000000000000;

    GridContents[] gridContents;

    /** @dev Checks if token exists
     * @param _tokenId The token id to check if exists
     */
    modifier onlyExistingTokens(uint256 _tokenId) {
        require(_exists(_tokenId), "Invalid Token ID");
        _;
    }

    /** @dev Checks if sender address has admin role
     */
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Does not have admin role");
        _;
    }

    /** @dev Checks if sender address has admin role
     */
    modifier onlyTokenOwner(uint256 _tokenId) {
        require(ownerOf(_tokenId) == msg.sender, "Does not own token");
        _;
    }

    event RoyaltyGovernorContractChanged(address indexed royaltyGovernor);
    event GridNFTMinted(uint256 indexed id, address indexed owner);
    //Declare an Event for when canvas is written to
    event Painted(
        address indexed artist,
        uint256 indexed tokenId,
        uint256 indexed iteration,
        uint256[] colorIndex,
        uint256[] pixelGroups
    );

    constructor(
        address[] memory admins,
        MintManager _mintManager,
        PaintToken _tokenAddr
    ) public ERC721("Boring Security Grid - powered by MurAll", "GRID") {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }

        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(TRAIT_MOD_ROLE, admins[i]);
        }
        mintManager = _mintManager;

        paintToken = _tokenAddr;
    }

    /**
     * @param colorIndex    - Color index defining the 256 colors the pixels reference at display time (RGB565 format, 2 bytes per color)
     * @param pixelGroups   - RGB pixels in groups of 32 (1 pixel reference every 1 byte) - 512 groups of 32 pixels creating a 128 x 128 pixel image
     */
    function setPixels(
        uint256 tokenID,
        uint256[] memory colorIndex,
        uint256[] memory pixelGroups
    ) public nonReentrant onlyTokenOwner(tokenID) {
        require(colorIndex.length <= 16, "colour index too large"); // max 256 colors in groups of 16 (16 groups of 16 colors = 256 colors)
        require(pixelGroups.length == 512, "pixel groups too large"); // max 128 x 128 pixels

        uint256 pixelCount = 32 * pixelGroups.length;

        paintToken.burnFrom(msg.sender, PRICE_PER_PIXEL.mul(pixelCount));

        gridContents[tokenID].blockNumbers.push(block.number);

        emit Painted(msg.sender, tokenID, gridContents[tokenID].blockNumbers.length, colorIndex, pixelGroups);
    }

    /**
     * @notice Set the base URI for creating `tokenURI` for each NFT.
     * Only invokable by admin role.
     * @param _tokenUriBase base for the ERC721 tokenURI
     */
    function setTokenUriBase(string calldata _tokenUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        _setBaseURI(_tokenUriBase);
    }

    /**
     * @notice Set the contract URI for marketplace data.
     * Only invokable by admin role.
     * @param _contractURI contract uri for this contract
     */
    function setContractUri(string calldata _contractURI) external onlyAdmin {
        // Set the base for metadata tokenURI
        contractURI = _contractURI;
    }

    /**
     * @notice Set the Royalty Governer for creating `tokenURI` for each NFT.
     * Only invokable by admin role.
     * @param _royaltyGovAddr the address of the Royalty Governer contract
     */
    function setRoyaltyGovernor(IRoyaltyGovernor _royaltyGovAddr) external onlyAdmin {
        royaltyGovernorContract = _royaltyGovAddr;
        emit RoyaltyGovernorContractChanged(address(_royaltyGovAddr));
    }

    function royaltyInfo(
        uint256 _tokenId,
        uint256 _value,
        bytes calldata _data
    )
        external
        override
        returns (
            address _receiver,
            uint256 _royaltyAmount,
            bytes memory _royaltyPaymentData
        )
    {
        return royaltyGovernorContract.royaltyInfo(_tokenId, _value, _data);
    }

    function mint(uint256 amount) public payable nonReentrant {
        mintManager.checkCanMintPublic(msg.sender, msg.value, amount);

        for (uint256 i = 0; i < amount; ++i) {
            mintInternal(msg.sender);
        }
    }

    function mintPresale(
        uint256 index,
        uint256 maxAmount,
        bytes32[] calldata merkleProof,
        uint256 amountDesired
    ) public payable nonReentrant {
        mintManager.checkCanMintPresale(msg.sender, msg.value, index, maxAmount, merkleProof, amountDesired);

        uint256 amountToMint = maxAmount < amountDesired ? maxAmount : amountDesired;
        for (uint256 i = 0; i < amountToMint; ++i) {
            mintInternal(msg.sender);
        }
    }

    function mintInitial(uint256 amountToMint) public nonReentrant onlyAdmin returns (uint256) {
        mintManager.checkCanMintInitial(amountToMint);
        for (uint256 i = 0; i < amountToMint; ++i) {
            mintInternal(msg.sender);
        }
    }

    function mintInternal(address account) private {
        require(totalSupply() <= MAX_SUPPLY, "Maximum number of NFTs minted");

        // create the grid contents
        GridContents memory _gridNft = GridContents({blockNumbers: new uint256[](0)});

        // push the grid nft to the array
        gridContents.push(_gridNft);
        uint256 _id = gridContents.length - 1;

        _mint(account, _id);
        emit GridNFTMinted(_id, account);
    }

    function withdrawFunds(address payable _to) public onlyAdmin {
        (bool success, ) = _to.call{value: address(this).balance}("");
        require(success, "Failed to transfer the funds, aborting.");
    }

    function rescueTokens(address tokenAddress) public onlyAdmin {
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        require(IERC20(tokenAddress).transfer(msg.sender, balance), "rescueTokens: Transfer failed.");
    }

    function getCurrentGridContentsBlock(uint256 _tokenId) public view returns (uint256) {
        return gridContents[_tokenId].blockNumbers[gridContents[_tokenId].blockNumbers.length - 1];
    }

    function getGridContentsAtIteration(uint256 _tokenId, uint256 iteration) public view returns (uint256) {
        require(iteration < gridContents[_tokenId].blockNumbers.length, "Iteration out of range");
        return gridContents[_tokenId].blockNumbers[iteration];
    }

    function getTotalGridContentsIterations(uint256 _tokenId) public view returns (uint256) {
        return gridContents[_tokenId].blockNumbers.length;
    }

    fallback() external payable {}

    receive() external payable {}
}
