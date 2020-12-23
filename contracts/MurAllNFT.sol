// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {ArtwrkImageDataStorage} from "./storage/ArtwrkImageDataStorage.sol";

contract MurAllNFT is ERC721, Ownable, AccessControl {
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

    ArtwrkImageDataStorage artwrkImageDataStorage;
    ArtWork[] artworks;

    /**
     * @dev @notice Base URI for MurAll ARTWRK's off-chain images
     */
    string private mediaUriBase;

    /**
     * @dev @notice Base URI to view MurAll ARTWRK's on the MurAll website
     */
    string private viewUriBase;

    /** @dev Checks if token exists
     * @param _tokenId The token id to check if exists
     */
    modifier onlyExistingTokens(uint256 _tokenId) {
        require(_tokenId < totalSupply(), INVALID_TOKEN_ID);
        _;
    }

    /** @dev Checks if token is filled with artwork data
     * @param _tokenId The token id to check if filled with artwork data
     */
    modifier onlyFilledTokens(uint256 _tokenId) {
        require(isArtworkFilled(_tokenId), "Artwork is not filled");
        _;
    }

    /** @dev Checks if sender address has admin role
     */
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Does not have admin role");
        _;
    }

    event ArtworkFilled(uint256 indexed id, bool finished);

    /* TODO Name TBC: I was thinking something to signify its a small piece, like a snippet of art */
    constructor(address[] memory admins, ArtwrkImageDataStorage _artwrkImageDataStorageAddr)
        public
        ERC721("MurAll", "ARTWRK")
    {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }
        artwrkImageDataStorage = _artwrkImageDataStorageAddr;
    }

    function mint(
        address origin,
        uint256[] memory colorIndex,
        uint256[] memory individualPixels,
        uint256[] memory pixelGroups,
        uint256[] memory pixelGroupIndexes,
        uint256[] memory transparentPixelGroups,
        uint256[] memory transparentPixelGroupIndexes,
        uint256[2] memory metadata
    ) public onlyOwner returns (uint256) {
        // calculate data hashes
        bytes32 dataHash = keccak256(
            abi.encodePacked(
                colorIndex,
                individualPixels,
                pixelGroups,
                pixelGroupIndexes,
                transparentPixelGroups,
                transparentPixelGroupIndexes
            )
        );

        // create the artwork object
        ArtWork memory _artwork = ArtWork(dataHash, origin, metadata[0], metadata[1]);

        // push the artwork to the array
        artworks.push(_artwork);
        uint256 _id = artworks.length - 1;

        _mint(origin, _id);

        return _id;
    }

    function fillData(
        uint256 id,
        uint256[] memory colorIndex,
        uint256[] memory individualPixels,
        uint256[] memory pixelGroups,
        uint256[] memory pixelGroupIndexes,
        uint256[] memory transparentPixelGroups,
        uint256[] memory transparentPixelGroupIndexes
    ) public onlyExistingTokens(id) {
        require(_isApprovedOrOwner(msg.sender, id), "Not approved or not owner of token");
        bytes32 dataHash = keccak256(
            abi.encodePacked(
                colorIndex,
                individualPixels,
                pixelGroups,
                pixelGroupIndexes,
                transparentPixelGroups,
                transparentPixelGroupIndexes
            )
        );
        require(artworks[id].dataHash == dataHash, "Incorrect data");

        bool filled = artwrkImageDataStorage.fillData(
            colorIndex,
            individualPixels,
            pixelGroups,
            pixelGroupIndexes,
            transparentPixelGroups,
            transparentPixelGroupIndexes
        );
        emit ArtworkFilled(id, filled);
    }

    function getFullDataForId(uint256 id)
        public
        view
        onlyExistingTokens(id)
        onlyFilledTokens(id)
        returns (
            address artist,
            uint256[] memory colorIndex,
            uint256[] memory individualPixels,
            uint256[] memory pixelGroups,
            uint256[] memory pixelGroupIndexes,
            uint256[] memory transparentPixelGroups,
            uint256[] memory transparentPixelGroupIndexes,
            uint256[2] memory metadata
        )
    {
        ArtWork memory _artwork = artworks[id];
        (
            colorIndex,
            individualPixels,
            pixelGroups,
            pixelGroupIndexes,
            transparentPixelGroups,
            transparentPixelGroupIndexes
        ) = getArtworkForId(id);
        artist = _artwork.artist;
        metadata = [_artwork.name, _artwork.metadata];
    }

    function getArtworkForId(uint256 id)
        public
        view
        onlyExistingTokens(id)
        onlyFilledTokens(id)
        returns (
            uint256[] memory colorIndex,
            uint256[] memory individualPixels,
            uint256[] memory pixelGroups,
            uint256[] memory pixelGroupIndexes,
            uint256[] memory transparentPixelGroups,
            uint256[] memory transparentPixelGroupIndexes
        )
    {
        return artwrkImageDataStorage.getArtworkForDataHash(artworks[id].dataHash);
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

    function getAlphaChannel(uint256 id) public view onlyExistingTokens(id) onlyFilledTokens(id) returns (uint256) {
        require(hasAlphaChannel(id), "Artwork has no alpha");
        // alpha is the first color in the color index
        return
            artwrkImageDataStorage.getColorIndexForDataHash(artworks[id].dataHash)[0] >> CONVERSION_SHIFT_BYTES_RGB565;
    }

    function getArtworkFillCompletionStatus(uint256 id)
        public
        view
        onlyExistingTokens(id)
        returns (
            uint256 colorIndexLength,
            uint256 individualPixelsLength,
            uint256 pixelGroupsLength,
            uint256 pixelGroupIndexesLength,
            uint256 transparentPixelGroupsLength,
            uint256 transparentPixelGroupIndexesLength
        )
    {
        return artwrkImageDataStorage.getArtworkFillCompletionStatus(artworks[id].dataHash);
    }

    function isArtworkFilled(uint256 id) public view onlyExistingTokens(id) returns (bool) {
        return artwrkImageDataStorage.isArtworkFilled(artworks[id].dataHash);
    }

    function getArtist(uint256 id) public view onlyExistingTokens(id) returns (address) {
        return artworks[id].artist;
    }

    /**
     * @notice Set the base URI for creating `tokenURI` for each MurAll ARTWRK.
     * Only invokable by admin role.
     * @param _tokenUriBase base for the ERC721 tokenURI
     */
    function setTokenUriBase(string calldata _tokenUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        _setBaseURI(_tokenUriBase);
    }

    /**
     * @notice Set the base URI for the image of each MurAll ARTWRK.
     * Only invokable by admin role.
     * @param _mediaUriBase base for the mediaURI shown in metadata for each MurAll ARTWRK
     */
    function setMediaUriBase(string calldata _mediaUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        mediaUriBase = _mediaUriBase;
    }

    /**
     * @notice Set the base URI for the viewing the MurAll ARTWRK on the MurAll website.
     * Only invokable by admin role.
     * @param _viewUriBase base URI for viewing an MurAll ARTWRK on the MurAll website
     */
    function setViewUriBase(string calldata _viewUriBase) external onlyAdmin {
        // Set the base for metadata tokenURI
        viewUriBase = _viewUriBase;
    }

    /**
     * @notice Get view URI for a given MurAll ARTWRK's Token ID.
     * @param _tokenId the Token ID of a previously minted MurAll ARTWRK
     * @return uri the off-chain URI to view the Avastar on the MurAll website
     */
    function viewURI(uint256 _tokenId) public view returns (string memory uri) {
        require(_tokenId < totalSupply(), INVALID_TOKEN_ID);
        uri = string(abi.encodePacked(viewUriBase, _tokenId.toString()));
    }

    /**
     * @notice Get media URI for a given MurAll ARTWRK's Token ID.
     * @param _tokenId the Token ID of a previously minted MurAll ARTWRK's
     * @return uri the off-chain URI to the MurAll ARTWRK's image
     */
    function mediaURI(uint256 _tokenId) public view returns (string memory uri) {
        require(_tokenId < totalSupply(), INVALID_TOKEN_ID);
        uri = string(abi.encodePacked(mediaUriBase, _tokenId.toString()));
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
