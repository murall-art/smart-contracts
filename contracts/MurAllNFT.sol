pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MurAllNFT is ERC721, Ownable {
    uint256 constant FILL_DATA_GAS_RESERVE = 26000;
    // 0xffffff0000000000000000000000000000000000000000000000000000000000
    uint256 constant FIRST_3_BYTES_MASK = 115792082335569848633007197573932045576244532214531591869071028845388905840640;
    // 0x000000000000000000000000000000000000000000000000000000000000000f
    uint256 constant ARTWORK_COMPLETE_BYTES_MASK = 15;
    uint256 constant CONVERSION_SHIFT_BYTES = 232;

    struct ArtWork {
        bytes32 dataHash;
        uint256[] individualPixels;
        uint256[] pixelGroups;
        uint256[] pixelGroupIndexes;
        uint256 completionData;
    }

    ArtWork[] artworks;

    event ArtworkFilled(
        uint256 indexed id,
        bool finished,
        uint256 lastIndividualPixelsIndex,
        uint256 lastPixelGroupsIndex,
        uint256 lastPixelGroupIndexesIndex
    );

    /* TODO Name TBC: I was thinking something to signify its a small piece, like a snippet of art */
    constructor() public ERC721("MurAll NFT", "ARTWRK") {}

    function mint(
        address origin,
        uint256[] memory individualPixels,
        uint256[] memory pixelGroups,
        uint256[] memory pixelGroupIndexes
    ) public onlyOwner returns (uint256) {
        // calculate data hashes
        bytes32 dataHash = keccak256(abi.encodePacked(individualPixels, pixelGroups, pixelGroupIndexes));

        // create the artwork object
        ArtWork memory _artwork = ArtWork(
            dataHash,
            new uint256[](individualPixels.length),
            new uint256[](pixelGroups.length),
            new uint256[](pixelGroupIndexes.length),
            0
        );

        // push the artwork to the array
        artworks.push(_artwork);
        uint256 _id = artworks.length - 1;

        _mint(origin, _id);

        return _id;
    }

    function fillData(
        uint256 id,
        uint256[] memory individualPixels,
        uint256[] memory pixelGroups,
        uint256[] memory pixelGroupIndexes
    ) public {
        ArtWork storage _artwork = artworks[id];
        require(_isApprovedOrOwner(msg.sender, id), "Not approved or not owner of token");

        require((ARTWORK_COMPLETE_BYTES_MASK & _artwork.completionData) == 0, "Artwork already filled");

        bytes32 dataHash = keccak256(abi.encodePacked(individualPixels, pixelGroups, pixelGroupIndexes));

        uint256 len;
        uint256 index;
        uint256 lastIndividualPixelsIndex = (FIRST_3_BYTES_MASK & _artwork.completionData) >> CONVERSION_SHIFT_BYTES;
        uint256 lastPixelGroupsIndex = (FIRST_3_BYTES_MASK & (_artwork.completionData << 24)) >> CONVERSION_SHIFT_BYTES;
        uint256 lastPixelGroupIndexesIndex = (FIRST_3_BYTES_MASK & (_artwork.completionData << 48)) >>
            CONVERSION_SHIFT_BYTES;

        require(_artwork.dataHash == dataHash, "Incorrect data");

        // fill individual pixels
        if (gasleft() > FILL_DATA_GAS_RESERVE && individualPixels.length > 0) {
            index = lastIndividualPixelsIndex == 0 ? 0 : lastIndividualPixelsIndex + 1;

            len = individualPixels.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artwork.individualPixels[index] = individualPixels[index];
                lastIndividualPixelsIndex = index;
                index++;
            }
        }

        // fill pixel groups
        if (gasleft() > FILL_DATA_GAS_RESERVE && pixelGroups.length > 0) {
            index = lastPixelGroupsIndex == 0 ? 0 : lastPixelGroupsIndex + 1;

            len = pixelGroups.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artwork.pixelGroups[index] = pixelGroups[index];
                lastPixelGroupsIndex = index;
                index++;
            }
        }

        // fill pixel group indexes
        if (gasleft() > FILL_DATA_GAS_RESERVE && pixelGroupIndexes.length > 0) {
            index = lastPixelGroupIndexesIndex == 0 ? 0 : lastPixelGroupIndexesIndex + 1;

            len = pixelGroupIndexes.length;

            while ((gasleft() > FILL_DATA_GAS_RESERVE) && index < len) {
                _artwork.pixelGroupIndexes[index] = pixelGroupIndexes[index];
                lastPixelGroupIndexesIndex = index;
                index++;
            }
        }

        // track completion state
        uint256 artworkCompleteBytes;

        if (
            ((lastIndividualPixelsIndex == individualPixels.length - 1) || (individualPixels.length == 0)) &&
            ((lastPixelGroupsIndex == pixelGroups.length - 1) || (pixelGroups.length == 0)) &&
            ((lastPixelGroupIndexesIndex == pixelGroupIndexes.length - 1) || (pixelGroupIndexes.length == 0))
        ) {
            artworkCompleteBytes = ARTWORK_COMPLETE_BYTES_MASK;
        }

        // update completion data with last indexes and completion state
        _artwork.completionData =
            (lastIndividualPixelsIndex << CONVERSION_SHIFT_BYTES) |
            (lastPixelGroupsIndex << (CONVERSION_SHIFT_BYTES - 24)) |
            (lastPixelGroupIndexesIndex << (CONVERSION_SHIFT_BYTES - 48)) |
            artworkCompleteBytes;

        emit ArtworkFilled(
            id,
            artworkCompleteBytes != 0,
            lastIndividualPixelsIndex,
            lastPixelGroupsIndex,
            lastPixelGroupIndexesIndex
        );
    }

    function getArtworkForId(uint256 id)
        public
        view
        returns (
            uint256[] memory individualPixels,
            uint256[] memory pixelGroups,
            uint256[] memory pixelGroupIndexes
        )
    {
        ArtWork memory _artwork = artworks[id];
        require((ARTWORK_COMPLETE_BYTES_MASK & _artwork.completionData) != 0, "Artwork is unfinished");

        return (_artwork.individualPixels, _artwork.pixelGroups, _artwork.pixelGroupIndexes);
    }

    function getArtworkDataHashForId(uint256 id) public view returns (bytes32) {
        return artworks[id].dataHash;
    }
}
