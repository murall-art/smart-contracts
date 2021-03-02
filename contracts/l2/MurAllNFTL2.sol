// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {IMintableERC721} from "./IMintableERC721.sol";

/**
 * L2 MurAll NFT contract, with L2 deposit/withdraw functions
 */
contract MurAllNFTL2 is ERC721, IMintableERC721, Ownable, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    using Strings for uint256;

    string public constant INVALID_TOKEN_ID = "Invalid Token ID";

    // 0xFFFFFF0000000000000000000000000000000000000000000000000000000000
    uint256 constant FIRST_3_BYTES_MASK = 115792082335569848633007197573932045576244532214531591869071028845388905840640;
    // 0x000000000000000000000000000000000000000000000000000000000000000F
    uint256 constant METADATA_HAS_ALPHA_CHANNEL_BYTES_MASK = 15;
    uint256 constant CONVERSION_SHIFT_BYTES = 232;
    uint256 constant CONVERSION_SHIFT_BYTES_RGB565 = 240;

    struct ArtWork {
        bytes32 dataHash;
        address artist;
        uint256 name;
        uint256 metadata;
    }
    mapping(uint256 => ArtWork) public artworks;

    // keeping it for checking, whether deposit being called by valid address or not
    address public rootChainManagerProxy;

    /**
     * @dev @notice Base URI for MURALL NFT's off-chain images
     */
    string private mediaUriBase;

    /**
     * @dev @notice Base URI to view MURALL NFT's on the MurAll website
     */
    string private viewUriBase;

    /** @dev Checks if sender is childChainManagerProxy
     */
    modifier onlyRootChainManagerProxy() {
        require(msg.sender == rootChainManagerProxy, "Address is not RootChainManagerProxy");
        _;
    }

    /** @dev Checks if token exists
     * @param _tokenId The token id to check if exists
     */
    modifier onlyExistingTokens(uint256 _tokenId) {
        require(_tokenId < totalSupply(), INVALID_TOKEN_ID);
        _;
    }

    /** @dev Checks if sender address has admin role
     */
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Does not have admin role");
        _;
    }

    event ArtworkFilled(uint256 indexed id, bool finished);

    constructor(address _rootChainManagerProxy, address[] memory admins) public ERC721("MurAll L2", "L2MURALL") {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }
        rootChainManagerProxy = _rootChainManagerProxy;
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

    function getFullDataForId(uint256 id)
        public
        view
        onlyExistingTokens(id)
        returns (
            address artist,
            bytes32 dataHash,
            uint256 name,
            uint256 metadata
        )
    {
        ArtWork memory _artwork = artworks[id];

        artist = _artwork.artist;
        dataHash = _artwork.dataHash;
        name = _artwork.name;
        metadata = _artwork.metadata;
    }

    function getArtist(uint256 id) public view onlyExistingTokens(id) returns (address) {
        return artworks[id].artist;
    }

    function getArtworkDataHashForId(uint256 id) public view onlyExistingTokens(id) returns (bytes32) {
        return artworks[id].dataHash;
    }

    function getName(uint256 id) public view onlyExistingTokens(id) returns (string memory) {
        return bytes32ToString(bytes32(artworks[id].name));
    }

    function getNumber(uint256 id) public view onlyExistingTokens(id) returns (uint256) {
        return (FIRST_3_BYTES_MASK & artworks[id].metadata) >> CONVERSION_SHIFT_BYTES;
    }

    function getSeriesId(uint256 id) public view onlyExistingTokens(id) returns (uint256) {
        return (FIRST_3_BYTES_MASK & (artworks[id].metadata << 24)) >> CONVERSION_SHIFT_BYTES;
    }

    function hasAlphaChannel(uint256 id) public view onlyExistingTokens(id) returns (bool) {
        return (METADATA_HAS_ALPHA_CHANNEL_BYTES_MASK & artworks[id].metadata) != 0;
    }

    // being proxified smart contract, most probably childChainManagerProxy contract's address
    // is not going to change ever, but still, lets keep it
    function updateRootChainManager(address newRootChainManagerProxy) external onlyAdmin {
        require(newRootChainManagerProxy != address(0), "Bad RootChainManagerProxy address");

        rootChainManagerProxy = newRootChainManagerProxy;
    }

    /**
     * @dev See {IMintableERC721-mint}.
     *
     * If you're attempting to bring metadata associated with token
     * from L2 to L1, you must implement this method
     */
    function mint(
        address user,
        uint256 tokenId,
        bytes calldata metaData
    ) external override onlyRootChainManagerProxy {
        _mint(user, tokenId);

        setTokenMetadata(tokenId, metaData);
    }

    /**
     * @dev See {IMintableERC721-mint}.
     */
    function mint(address user, uint256 tokenId) external override onlyRootChainManagerProxy {
        _mint(user, tokenId);
    }

    /**
     * If you're attempting to bring metadata associated with token
     * from L2 to L1, you must implement this method, to be invoked
     * when minting token back on L1, during exit
     */
    function setTokenMetadata(uint256 tokenId, bytes memory data) internal virtual {
        // This function should decode metadata obtained from L2
        // and attempt to set it for this `tokenId`
        //
        // Following is just a default implementation, feel
        // free to define your own encoding/ decoding scheme
        // for L2 -> L1 token metadata transfer
        (bytes32 dataHash, address artist, uint256 name, uint256 metadata) = abi.decode(
            data,
            (bytes32, address, uint256, uint256)
        );
        ArtWork memory _artwork = ArtWork(dataHash, artist, name, metadata);
        artworks[tokenId] = _artwork;
    }

    /**
     * @dev See {IMintableERC721-exists}.
     */
    function exists(uint256 tokenId) external override view returns (bool) {
        return _exists(tokenId);
    }

    function bytes32ToString(bytes32 x) internal pure returns (string memory) {
        bytes memory bytesString = new bytes(32);
        uint256 charCount = 0;
        uint256 j;
        for (j = 0; j < 32; j++) {
            bytes1 char = bytes1(bytes32(uint256(x) * 2**(8 * j)));
            if (char != 0) {
                bytesString[charCount] = char;
                charCount++;
            }
        }
        bytes memory bytesStringTrimmed = new bytes(charCount);
        for (j = 0; j < charCount; j++) {
            bytesStringTrimmed[j] = bytesString[j];
        }
        return string(bytesStringTrimmed);
    }
}
