pragma solidity ^0.6.0;

import {PaintToken} from "./PaintToken.sol";
import {MurAllNFT} from "./MurAllNFT.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MurAll is ReentrancyGuard {
    uint256 constant NUM_OF_GROUPS = 129600; // 2073600 pixels / 16 pixels per group
    uint256 constant MAX_PIXEL_RES = 2073600;
    uint256 constant NUMBER_PER_GROUP = 16;
    uint256 constant NUMBER_PER_INDEX_GROUP = 10;
    uint256 constant THREE_BYTES = 24;
    uint256 constant TWO_BYTES = 16;
    uint256 constant INDIVIDUAL_PIXEL_POSITION_SHIFT_BYTES = 40;
    uint256 constant COORD_CONVERSION_SHIFT_BYTES = 216;
    uint256 constant PIXEL_GROUP_CONVERSION_SHIFT_BYTES = 232;
    // 0xffffff0000000000000000000000000000000000000000000000000000000000
    uint256 constant FIRST_3_BYTES_MASK = 115792082335569848633007197573932045576244532214531591869071028845388905840640;
    // 0xffff000000000000000000000000000000000000000000000000000000000000;
    uint256 constant FIRST_2_BYTES_MASK = 115790322390251417039241401711187164934754157181743688420499462401711837020160;
    // 0x0000ffffff000000000000000000000000000000000000000000000000000000
    uint256 constant COORD_BYTES_MASK = 1766846959466092661026110802824890832157051577980523557572494946981642240;
    uint256 constant PRICE_PER_PIXEL = 500000000000000;

    PaintToken public paintToken;
    MurAllNFT public murAllNFT;

    mapping(address => bool) public artists;
    uint256 public totalArtists;

    constructor(PaintToken _tokenAddr, MurAllNFT _murAllNFTAddr) public {
        paintToken = _tokenAddr;
        murAllNFT = _murAllNFTAddr;
    }

    //Declare an Event for when canvas is written to
    event Painted(
        address indexed artist,
        uint256 indexed tokenId,
        uint256[] pixelData,
        uint256[] pixelGroups,
        uint256[] pixelGroupIndexes,
        uint256[2] metadata
    );

    /**
     * @param individualPixels     - individual RGB pixels (2 bytes) twinned with their respective positions (3 bytes) - 6 pixels per uint256
     * @param pixelGroups          - RGB pixels in groups of 16 (1 pixel every 2 bytes, RGB565 format)
     * @param pixelGroupIndexes    - Group indexes matching the groups (1 index for every 3 bytes, 10 indexes per 32 byte entry)
     * @param metadata             - an array of 2 metadata items in order: name (32 byte string converted to uint256), other metadata (formatted byte array consiting of number, seriesId, alpha channel and alpha channel flag)
     */
    function setPixels(
        uint256[] memory individualPixels,
        uint256[] memory pixelGroups,
        uint256[] memory pixelGroupIndexes,
        uint256[2] memory metadata
    ) public nonReentrant {
        uint256 pixelCount = 0;

        uint256 len = individualPixels.length;
        require(len <= 345600, "individualPixels too large"); //Each slot in the data fits 6 px and 6 indexes (2073600 / 6)

        uint24 a;
        uint24 b;
        uint24 c;
        uint24 d;
        uint24 e;
        uint24 f;

        if (len > 0) {
            // Do first set of pixels separately to initialise currentGroup
            for (uint256 currentIndex = 0; currentIndex < len - 1; currentIndex++) {
                decodeAndCheckIndividualPixelIndexes(individualPixels[currentIndex]);
            }
            //assuming all individual pixel groups except the last have all 6 pixels filled
            pixelCount += (6 * (len - 1)); // 6 individual pixels per uint256

            //decode the last group and check the pixels individually to ensure pixel count is correct
            (a, b, c, d, e, f) = decodeAndCheckIndividualPixelIndexes(individualPixels[len - 1]);

            if (a != 0) {
                pixelCount++;
            }
            if (b != 0) {
                pixelCount++;
            }
            if (c != 0) {
                pixelCount++;
            }
            if (d != 0) {
                pixelCount++;
            }
            if (e != 0) {
                pixelCount++;
            }
            if (f != 0) {
                pixelCount++;
            }
        }

        len = pixelGroups.length;

        pixelCount += (len * NUMBER_PER_GROUP); // 16 pixels per group
        paintToken.burnFrom(msg.sender, PRICE_PER_PIXEL * pixelCount);

        require(len <= NUM_OF_GROUPS, "pixel groups too large"); //Each slot in the data fits 16 px (2073600 / 16)
        len = pixelGroupIndexes.length;
        for (uint256 currentIndex = 0; currentIndex < len; currentIndex++) {
            decodeAndCheckGroupIndexes(pixelGroupIndexes[currentIndex]);
        }

        uint256 tokenId = murAllNFT.mint(msg.sender, individualPixels, pixelGroups, pixelGroupIndexes, metadata);

        // add address to available list of artists
        if (!isArtist(msg.sender)) {
            artists[msg.sender] = true;
            totalArtists++;
        }

        emit Painted(msg.sender, tokenId, individualPixels, pixelGroups, pixelGroupIndexes, metadata);
    }

    function decodeAndCheckIndividualPixelIndexes(uint256 x)
        internal
        pure
        returns (
            uint24 a,
            uint24 b,
            uint24 c,
            uint24 d,
            uint24 e,
            uint24 f
        )
    {
        assembly {
            f := x
            mstore(0x19, x)
            a := mload(0)
            mstore(0x14, x)
            b := mload(0)
            mstore(0x0F, x)
            c := mload(0)
            mstore(0x0A, x)
            d := mload(0)
            mstore(0x05, x)
            e := mload(0)
        }
        require(
            a < MAX_PIXEL_RES &&
                b < MAX_PIXEL_RES &&
                c < MAX_PIXEL_RES &&
                d < MAX_PIXEL_RES &&
                e < MAX_PIXEL_RES &&
                f < MAX_PIXEL_RES,
            "coord is out of range"
        ); // coordinate is in 1920 x 1080 px resolution range
    }

    function decodeAndCheckGroupIndexes(uint256 x)
        public
        pure
        returns (
            uint24 a,
            uint24 b,
            uint24 c,
            uint24 d,
            uint24 e,
            uint24 f,
            uint24 g,
            uint24 h,
            uint24 i,
            uint24 j
        )
    {
        assembly {
            j := x
            mstore(0x1B, x)
            a := mload(0)
            mstore(0x18, x)
            b := mload(0)
            mstore(0x15, x)
            c := mload(0)
            mstore(0x12, x)
            d := mload(0)
            mstore(0x0F, x)
            e := mload(0)
            mstore(0x0C, x)
            f := mload(0)
            mstore(0x09, x)
            g := mload(0)
            mstore(0x06, x)
            h := mload(0)
            mstore(0x03, x)
            i := mload(0)
        }
        require(
            a < NUM_OF_GROUPS &&
                b < NUM_OF_GROUPS &&
                c < NUM_OF_GROUPS &&
                d < NUM_OF_GROUPS &&
                e < NUM_OF_GROUPS &&
                f < NUM_OF_GROUPS &&
                g < NUM_OF_GROUPS &&
                h < NUM_OF_GROUPS &&
                i < NUM_OF_GROUPS &&
                j < NUM_OF_GROUPS,
            "group is out of range"
        ); // group is out of the 207360 range
    }

    function isArtist(address userAddress) public view returns (bool) {
        return artists[userAddress];
    }

    function getCostPerPixel() public pure returns (uint256 costInWei) {
        return PRICE_PER_PIXEL;
    }
}
