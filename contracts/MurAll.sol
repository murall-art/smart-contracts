pragma solidity ^0.6.0;

import {PaintToken} from "./PaintToken.sol";
import {MurAllNFT} from "./MurAllNFT.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract MurAll is ReentrancyGuard {
    uint256 constant NUM_OF_GROUPS = 64800; // 2073600 pixels / 32 pixels per group
    uint256 constant MAX_PIXEL_RES = 2073600;
    uint256 constant NUMBER_PER_GROUP = 32;
    uint256 constant NUMBER_PER_INDEX_GROUP = 16;

    uint256 constant PRICE_PER_PIXEL = 500000000000000000;

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
        uint256[] colorIndex,
        uint256[] pixelData,
        uint256[] pixelGroups,
        uint256[] pixelGroupIndexes,
        uint256[2] metadata
    );

    /**
     * @param colorIndex           - color index defining the 256 colors the pixels reference at display time (RGB565 format, 4 bytes per color)
     * @param individualPixels     - individual pixel references to the color index (1 bytes) twinned with their respective positions (3 bytes) - 8 pixels per uint256
     * @param pixelGroups          - RGB pixels in groups of 32 (1 pixel reference every 1 byte)
     * @param pixelGroupIndexes    - Group indexes matching the groups (1 index for every 2 bytes, 16 indexes per 32 byte entry)
     * @param metadata             - an array of 2 metadata items in order: name (32 byte string converted to uint256), other metadata (formatted byte array consiting of number, seriesId, alpha channel and alpha channel flag)
     */
    function setPixels(
        uint256[] memory colorIndex,
        uint256[] memory individualPixels,
        uint256[] memory pixelGroups,
        uint256[] memory pixelGroupIndexes,
        uint256[2] memory metadata
    ) public nonReentrant {
        uint256 pixelCount = 0;

        uint256 len = individualPixels.length;
        require(colorIndex.length <= 16, "colour index too large"); // max 256 colors in groups of 16 (16 groups of 16 colors = 256 colors)
        require(len <= 259200, "individualPixels too large"); //Each slot in the data fits 8 px and 8 indexes (2073600 / 8)

        if (len > 0) {
            // Do first set of pixels separately to initialise currentGroup
            for (uint256 currentIndex = 0; currentIndex < len - 1; currentIndex++) {
                require(checkIndividualPixelIndexes(individualPixels[currentIndex]) == 0, "coord is out of range"); // coordinate is in 1920 x 1080 px resolution range
            }
            //assuming all individual pixel groups except the last have all 6 pixels filled
            pixelCount += (6 * (len - 1)); // 6 individual pixels per uint256

            //decode the last group and check the pixels individually to ensure pixel count is correct
            uint24[8] memory convertedPixels = decodeAndCheckIndividualPixelIndexes(individualPixels[len - 1]);

            for (uint256 i = 0; i < convertedPixels.length; i++) {
                if (convertedPixels[i] != 0) {
                    pixelCount++;
                }
            }
        }

        len = pixelGroups.length;

        pixelCount += (len * NUMBER_PER_GROUP); // 32 pixels per group
        paintToken.burnFrom(msg.sender, PRICE_PER_PIXEL * pixelCount);

        require(len <= NUM_OF_GROUPS, "pixel groups too large"); //Each slot in the data fits 32 px (2073600 / 32)
        len = pixelGroupIndexes.length;
        for (uint256 currentIndex = 0; currentIndex < len; currentIndex++) {
            require(checkGroupIndexes(pixelGroupIndexes[currentIndex]) == 0, "group is out of range"); // group is out of the 207360 range
        }

        uint256 tokenId = murAllNFT.mint(
            msg.sender,
            colorIndex,
            individualPixels,
            pixelGroups,
            pixelGroupIndexes,
            metadata
        );

        // add address to available list of artists
        if (!isArtist(msg.sender)) {
            artists[msg.sender] = true;
            totalArtists++;
        }

        emit Painted(msg.sender, tokenId, colorIndex, individualPixels, pixelGroups, pixelGroupIndexes, metadata);
    }

    function checkIndividualPixelIndexes(uint256 toCheck) internal pure returns (uint256 valid) {
        assembly {
            let converted := and(toCheck, 0x0000000000000000000000000000000000000000000000000000000000FFFFFF) // first is actually last 2 bytes in the byte array (uint256 converted to uint16)
            if gt(converted, MAX_PIXEL_RES) {
                valid := 1
            }

            let len := 0x07
            let offset := 0x1C

            for {
                let i := 0
            } lt(i, len) {
                i := add(i, 1)
            } {
                mstore(offset, toCheck)
                converted := and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF)

                if gt(converted, MAX_PIXEL_RES) {
                    valid := 1
                }
                offset := sub(offset, 0x04)
            }
        }
    }

    function decodeAndCheckIndividualPixelIndexes(uint256 toCheck) public pure returns (uint24[8] memory converted) {
        assembly {
            mstore(converted, toCheck) // first is actually last 3 bytes in the byte array (uint256 converted to uint24)
            let len := 0x07
            let offset := 0x1C

            for {
                let i := 0
            } lt(i, len) {
                i := add(i, 1)
            } {
                mstore(offset, toCheck)
                mstore(add(converted, add(0x20, mul(i, 0x20))), mload(0)) // add data to the array, data offset = 0x20 (1st 32 is reserved for size) & i*32 to pickup the right index mstore(add(converted, add(0x20, mul(1, 0x20))), toCheck) // add data to the array, data offset = 0x20 (1st 32 is reserved for size) & i*32 to pickup the right index
                offset := sub(offset, 0x04)
            }
        }
        require(
            converted[0] < MAX_PIXEL_RES &&
                converted[1] < MAX_PIXEL_RES &&
                converted[2] < MAX_PIXEL_RES &&
                converted[3] < MAX_PIXEL_RES &&
                converted[4] < MAX_PIXEL_RES &&
                converted[5] < MAX_PIXEL_RES &&
                converted[6] < MAX_PIXEL_RES &&
                converted[7] < MAX_PIXEL_RES,
            "coord is out of range"
        ); // coordinate is in 1920 x 1080 px resolution range
    }

    function checkGroupIndexes(uint256 toCheck) public pure returns (uint256 valid) {
        assembly {
            let converted := and(toCheck, 0x000000000000000000000000000000000000000000000000000000000000FFFF) // first is actually last 2 bytes in the byte array (uint256 converted to uint16)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }
            let len := 0x0F //15 (we already have the first decoded)
            let offset := 0x1E

            for {
                let i := 0
            } lt(i, len) {
                i := add(i, 1)
            } {
                mstore(offset, toCheck)
                converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)

                if gt(converted, NUM_OF_GROUPS) {
                    valid := 1
                }
                offset := sub(offset, 0x02)
            }
        }
    }

    function isArtist(address userAddress) public view returns (bool) {
        return artists[userAddress];
    }

    function getCostPerPixel() public pure returns (uint256 costInWei) {
        return PRICE_PER_PIXEL;
    }
}
