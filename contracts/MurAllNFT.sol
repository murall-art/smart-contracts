pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MurAllNFT is ERC721, Ownable, AccessControl {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    using Strings for uint256;

    string public constant INVALID_TOKEN_ID = "Invalid Token ID";
    uint256 constant FILL_DATA_GAS_RESERVE = 26000;
    // 0xFFFFFF0000000000000000000000000000000000000000000000000000000000
    uint256 constant FIRST_3_BYTES_MASK = 115792082335569848633007197573932045576244532214531591869071028845388905840640;
    // 0x000000000000000000000000000000000000000000000000000000000000000F
    uint256 constant ARTWORK_COMPLETE_BYTES_MASK = 15;
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

    struct ArtWorkImageData {
        uint256[] colorIndex;
        uint256[] individualPixels;
        uint256[] pixelGroups;
        uint256[] pixelGroupIndexes;
        uint256 completionData;
    }

    mapping(bytes32 => ArtWorkImageData) private artworkImageDatas;
    ArtWork[] artworks;

    /**
     * @notice Base URI for MurAll ARTWRK's off-chain images
     */
    string private mediaUriBase;

    /**
     * @notice Base URI to view MurAll ARTWRK's on the MurAll website
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

    event ArtworkFilled(
        uint256 indexed id,
        bool finished,
        uint256 lastIndividualPixelsIndex,
        uint256 lastPixelGroupsIndex,
        uint256 lastPixelGroupIndexesIndex,
        uint256 lastColourIndexGroupIndex
    );

    /* TODO Name TBC: I was thinking something to signify its a small piece, like a snippet of art */
    constructor(address[] memory admins) public ERC721("MurAll", "ARTWRK") {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }
    }

    function mint(
        address origin,
        uint256[] memory colorIndex,
        uint256[] memory individualPixels,
        uint256[] memory pixelGroups,
        uint256[] memory pixelGroupIndexes,
        uint256[2] memory metadata
    ) public onlyOwner returns (uint256) {
        // calculate data hashes
        bytes32 dataHash = keccak256(abi.encodePacked(colorIndex, individualPixels, pixelGroups, pixelGroupIndexes));

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
        uint256[] memory pixelGroupIndexes
    ) public onlyExistingTokens(id) {
        ArtWork memory _artwork = artworks[id];
        require(_isApprovedOrOwner(msg.sender, id), "Not approved or not owner of token");

        bytes32 dataHash = keccak256(abi.encodePacked(colorIndex, individualPixels, pixelGroups, pixelGroupIndexes));
        require(_artwork.dataHash == dataHash, "Incorrect data");

        if (artworkImageDatas[dataHash].completionData == 0) {
            artworkImageDatas[dataHash] = ArtWorkImageData(
                new uint256[](colorIndex.length),
                new uint256[](individualPixels.length),
                new uint256[](pixelGroups.length),
                new uint256[](pixelGroupIndexes.length),
                0
            );
        }

        ArtWorkImageData storage _artworkImageData = artworkImageDatas[dataHash];

        require((ARTWORK_COMPLETE_BYTES_MASK & _artworkImageData.completionData) == 0, "Artwork already filled");

        uint256 len;
        uint256 index;
        uint256 lastIndividualPixelsIndex = (FIRST_3_BYTES_MASK & _artworkImageData.completionData) >>
            CONVERSION_SHIFT_BYTES;
        uint256 lastPixelGroupsIndex = (FIRST_3_BYTES_MASK & (_artworkImageData.completionData << 24)) >>
            CONVERSION_SHIFT_BYTES;
        uint256 lastPixelGroupIndexesIndex = (FIRST_3_BYTES_MASK & (_artworkImageData.completionData << 48)) >>
            CONVERSION_SHIFT_BYTES;
        uint256 lastColourIndexGroupIndex = (FIRST_3_BYTES_MASK & (_artworkImageData.completionData << 72)) >>
            CONVERSION_SHIFT_BYTES;

        // fill individual pixels
        if (gasleft() > FILL_DATA_GAS_RESERVE && individualPixels.length > 0) {
            index = lastIndividualPixelsIndex == 0 ? 0 : lastIndividualPixelsIndex + 1;

            len = individualPixels.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.individualPixels[index] = individualPixels[index];
                lastIndividualPixelsIndex = index;
                index++;
            }
        }

        // fill pixel groups
        if (gasleft() > FILL_DATA_GAS_RESERVE && pixelGroups.length > 0) {
            index = lastPixelGroupsIndex == 0 ? 0 : lastPixelGroupsIndex + 1;

            len = pixelGroups.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.pixelGroups[index] = pixelGroups[index];
                lastPixelGroupsIndex = index;
                index++;
            }
        }

        // fill pixel group indexes
        if (gasleft() > FILL_DATA_GAS_RESERVE && pixelGroupIndexes.length > 0) {
            index = lastPixelGroupIndexesIndex == 0 ? 0 : lastPixelGroupIndexesIndex + 1;

            len = pixelGroupIndexes.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.pixelGroupIndexes[index] = pixelGroupIndexes[index];
                lastPixelGroupIndexesIndex = index;
                index++;
            }
        }
        // fill colour index
        if (gasleft() > FILL_DATA_GAS_RESERVE && colorIndex.length > 0) {
            index = lastColourIndexGroupIndex == 0 ? 0 : lastColourIndexGroupIndex + 1;

            len = colorIndex.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artworkImageData.colorIndex[index] = colorIndex[index];
                lastColourIndexGroupIndex = index;
                index++;
            }
        }

        // track completion state
        uint256 artworkCompleteBytes;

        if (
            ((lastIndividualPixelsIndex == individualPixels.length - 1) || (individualPixels.length == 0)) &&
            ((lastPixelGroupsIndex == pixelGroups.length - 1) || (pixelGroups.length == 0)) &&
            ((lastPixelGroupIndexesIndex == pixelGroupIndexes.length - 1) || (pixelGroupIndexes.length == 0)) &&
            ((lastColourIndexGroupIndex == colorIndex.length - 1) || (colorIndex.length == 0))
        ) {
            artworkCompleteBytes = ARTWORK_COMPLETE_BYTES_MASK;
        }

        // update completion data with last indexes and completion state
        _artworkImageData.completionData =
            (lastIndividualPixelsIndex << CONVERSION_SHIFT_BYTES) |
            (lastPixelGroupsIndex << (CONVERSION_SHIFT_BYTES - 24)) |
            (lastPixelGroupIndexesIndex << (CONVERSION_SHIFT_BYTES - 48)) |
            (lastColourIndexGroupIndex << (CONVERSION_SHIFT_BYTES - 72)) |
            artworkCompleteBytes;

        emit ArtworkFilled(
            id,
            artworkCompleteBytes != 0,
            lastIndividualPixelsIndex,
            lastPixelGroupsIndex,
            lastPixelGroupIndexesIndex,
            lastColourIndexGroupIndex
        );
    }

    function getFullDataForId(uint256 id)
        public
        view
        onlyExistingTokens(id)
        onlyFilledTokens(id)
        returns (
            uint256[] memory colorIndex,
            uint256[] memory individualPixels,
            uint256[] memory pixelGroups,
            uint256[] memory pixelGroupIndexes,
            address artist,
            uint256 name,
            uint256 metadata
        )
    {
        ArtWork memory _artwork = artworks[id];
        ArtWorkImageData memory _artworkImageData = artworkImageDatas[_artwork.dataHash];
        return (
            _artworkImageData.colorIndex,
            _artworkImageData.individualPixels,
            _artworkImageData.pixelGroups,
            _artworkImageData.pixelGroupIndexes,
            _artwork.artist,
            _artwork.name,
            _artwork.metadata
        );
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
            uint256[] memory pixelGroupIndexes
        )
    {
        ArtWorkImageData memory _artworkImageData = artworkImageDatas[artworks[id].dataHash];
        return (
            _artworkImageData.colorIndex,
            _artworkImageData.individualPixels,
            _artworkImageData.pixelGroups,
            _artworkImageData.pixelGroupIndexes
        );
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
        return artworkImageDatas[artworks[id].dataHash].colorIndex[0] >> CONVERSION_SHIFT_BYTES_RGB565;
    }

    function getArtworkFillCompletionStatus(uint256 id)
        public
        view
        onlyExistingTokens(id)
        returns (
            uint256 lastIndividualPixelsIndex,
            uint256 lastPixelGroupsIndex,
            uint256 lastPixelGroupIndexesIndex,
            uint256 lastColourIndexGroupIndex
        )
    {
        ArtWorkImageData memory _artworkImageData = artworkImageDatas[artworks[id].dataHash];
        lastIndividualPixelsIndex = (FIRST_3_BYTES_MASK & _artworkImageData.completionData) >> CONVERSION_SHIFT_BYTES;
        lastPixelGroupsIndex =
            (FIRST_3_BYTES_MASK & (_artworkImageData.completionData << 24)) >>
            CONVERSION_SHIFT_BYTES;
        lastPixelGroupIndexesIndex =
            (FIRST_3_BYTES_MASK & (_artworkImageData.completionData << 48)) >>
            CONVERSION_SHIFT_BYTES;
        lastColourIndexGroupIndex =
            (FIRST_3_BYTES_MASK & (_artworkImageData.completionData << 72)) >>
            CONVERSION_SHIFT_BYTES;
        return (lastIndividualPixelsIndex, lastPixelGroupsIndex, lastPixelGroupIndexesIndex, lastColourIndexGroupIndex);
    }

    function isArtworkFilled(uint256 id) public view onlyExistingTokens(id) returns (bool) {
        return (ARTWORK_COMPLETE_BYTES_MASK & artworkImageDatas[artworks[id].dataHash].completionData) != 0;
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
