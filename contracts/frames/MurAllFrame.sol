// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IFrameImageStorage} from "./IFrameImageStorage.sol";
import {IERC2981} from "../royalties/IERC2981.sol";
import {IRoyaltyGovernor} from "../royalties/IRoyaltyGovernor.sol";
import "@chainlink/contracts/src/v0.6/VRFConsumerBase.sol";

/**
 * MurAll Frame contract
 */
contract MurAllFrame is ERC721, Ownable, AccessControl, ReentrancyGuard, IERC2981, VRFConsumerBase {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    using Strings for uint256;

    IFrameImageStorage public traitImageStorage;
    IRoyaltyGovernor public royaltyGovernorContract;

    bool internal publicMintingEnabled = false;
    bool internal presaleMintingEnabled = false;

    uint256 constant NUM_LEGENDARIES_MINTABLE = 10;
    uint256 constant NUM_PRESALE_MINTABLE = 100;
    uint256 constant MAX_SUPPLY = 2100;

    uint256[] internal initialFrameTraits;

    // for chainlink vrf
    bytes32 internal keyHash;
    uint256 internal fee;
    uint256 public traitSeed;

    event RandomnessRequested(bytes32 requestId);
    event TraitSeedSet(uint256 seed);

    /**
     * @dev @notice Base URI for MURALL NFT's off-chain images
     */
    string private mediaUriBase;

    /**
     * @dev @notice Base URI to view MURALL NFT's on the MurAll website
     */
    string private viewUriBase;

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

    event FrameMinted(uint256 indexed id, address indexed owner);
    event FrameTraitsUpdated(uint256 indexed id, address indexed owner, uint256 traits);
    event RoyaltyGovernorContractChanged(address indexed royaltyGovernor);
    event FrameTraitImageStorageContractChanged(address indexed traitImageStorage);

    constructor(
        address[] memory admins,
        address _vrfCoordinator,
        address _linkTokenAddr,
        bytes32 _keyHash,
        uint256 _fee
    ) public ERC721("MurAll Frame", "FRAME") VRFConsumerBase(_vrfCoordinator, _linkTokenAddr) {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }

        keyHash = _keyHash;
        fee = _fee;
    }

    function mint() external payable nonReentrant returns (uint256) {
        require(publicMintingEnabled, "Public minting not enabled");

        return mintPrivate();
    }

    function mintPresale() external payable nonReentrant returns (uint256) {
        require(presaleMintingEnabled, "Presale minting not enabled");
        require(totalSupply() <= NUM_PRESALE_MINTABLE, "Maximum number of presale NFT's reached");
        return mintPrivate();
    }

    function mintLegendary(uint256 traitHash) public nonReentrant onlyAdmin returns (uint256) {
        require(totalSupply() <= NUM_LEGENDARIES_MINTABLE, "Maximum number of initial NFT's reached");
        initialFrameTraits.push(traitHash);

        return mintPrivate();
    }

    function mintPrivate() private nonReentrant onlyAdmin returns (uint256) {
        require(totalSupply() <= MAX_SUPPLY, "Maximum number of frames minted");

        uint256 _id = totalSupply();

        _mint(msg.sender, _id);

        emit FrameMinted(_id, msg.sender);
        return _id;
    }

    /**
     * @notice Set the base URI for creating `tokenURI` for each MURALL NFT.
     * Only invokable by admin role.
     * @param _tokenUriBase base for the ERC721 tokenURI
     */
    function setTokenUriBase(string calldata _tokenUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        _setBaseURI(_tokenUriBase);
    }

    /**
     * @notice Set the base URI for the image of each MURALL NFT.
     * Only invokable by admin role.
     * @param _mediaUriBase base for the mediaURI shown in metadata for each MURALL NFT
     */
    function setMediaUriBase(string calldata _mediaUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        mediaUriBase = _mediaUriBase;
    }

    /**
     * @notice Set the base URI for the viewing the MURALL NFT on the MurAll website.
     * Only invokable by admin role.
     * @param _viewUriBase base URI for viewing an MURALL NFT on the MurAll website
     */
    function setViewUriBase(string calldata _viewUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        viewUriBase = _viewUriBase;
    }

    /**
     * @notice Get view URI for a given MURALL NFT's Token ID.
     * @param _tokenId the Token ID of a previously minted MURALL NFT
     * @return uri the off-chain URI to view the Avastar on the MurAll website
     */
    function viewURI(uint256 _tokenId) public view onlyExistingTokens(_tokenId) returns (string memory uri) {
        uri = string(abi.encodePacked(viewUriBase, _tokenId.toString()));
    }

    /**
     * @notice Get media URI for a given MURALL NFT's Token ID.
     * @param _tokenId the Token ID of a previously minted MURALL NFT's
     * @return uri the off-chain URI to the MURALL NFT's image
     */
    function mediaURI(uint256 _tokenId) public view onlyExistingTokens(_tokenId) returns (string memory uri) {
        uri = string(abi.encodePacked(mediaUriBase, _tokenId.toString()));
    }

    function rescueTokens(address tokenAddress) public onlyAdmin {
        uint256 balance = IERC20(tokenAddress).balanceOf(address(this));
        require(IERC20(tokenAddress).transfer(msg.sender, balance), "MurAllFrame: Transfer failed.");
    }

    function setPublicMintingEnabled(bool enabled) public onlyAdmin {
        publicMintingEnabled = enabled;
    }

    /**
     * @notice Set the frame trait image storage contract.
     * Only invokable by admin role.
     * @param storageAddress the address of the frame trait image storage contract
     */
    function setFrameTraitImageStorage(IFrameImageStorage storageAddress) public onlyAdmin {
        traitImageStorage = IFrameImageStorage(storageAddress);
        emit FrameTraitImageStorageContractChanged(address(storageAddress));
    }

    /**
     * @notice Set the Royalty Governer for creating `tokenURI` for each Montage NFT.
     * Only invokable by admin role.
     * @param _royaltyGovAddr the address of the Royalty Governer contract
     */
    function setRoyaltyGovernor(IRoyaltyGovernor _royaltyGovAddr) external onlyAdmin {
        royaltyGovernorContract = _royaltyGovAddr;
        emit RoyaltyGovernorContractChanged(address(_royaltyGovAddr));
    }

    function getTraits(uint256 _tokenId) public view onlyExistingTokens(_tokenId) returns (uint256 traits) {
        if (_tokenId < NUM_LEGENDARIES_MINTABLE) {
            return initialFrameTraits[_tokenId];
        } else {
            require(traitSeed != 0, "Trait seed not set yet");
            return generateTraits(traitSeed, _tokenId);
        }
    }

    function generateTraits(uint256 randomValue, uint256 tokenId) private pure returns (uint256 traits) {
        return uint256(keccak256(abi.encode(randomValue, tokenId)));
    }

    /** Chainlink VRF ****************************/
    function requestTraitSeed() public onlyAdmin nonReentrant {
        require(traitSeed == 0, "Trait seed already requested");
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK - fill contract with faucet");
        bytes32 requestId = requestRandomness(keyHash, fee);

        emit RandomnessRequested(requestId);
    }

    /**
     * Callback function used by VRF Coordinator
     */
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        require(traitSeed == 0, "Trait seed already requested");
        traitSeed = randomness;
        emit TraitSeedSet(randomness);
    }

    /** END Chainlink VRF ****************************/

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
}
