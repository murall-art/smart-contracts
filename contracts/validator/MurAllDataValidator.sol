pragma solidity ^0.6.0;

import {DataValidator} from "./DataValidator.sol";

contract MurAllDataValidator is DataValidator {
    uint256 constant MAX_PIXEL_RES = 2073600; // 1920 x 1080 pixels
    uint256 constant NUMBER_PER_GROUP = 32;
    uint256 constant NUM_OF_GROUPS = 64800; // 2073600 pixels / 32 pixels per group
    uint256 constant MAX_INDIVIDUAL_PIXEL_ARRAY_LENGTH = 259200; //Each slot in the data fits 8 px and 8 indexes (2073600 / 8)
    uint256 constant NUMBER_PER_INDEX_GROUP = 16;

    function validate(
        uint256[] memory pixelData,
        uint256[] memory pixelGroups,
        uint256[] memory pixelGroupIndexes
    ) public override pure returns (uint256 numberOfPixels) {
        uint256 pixelCount = 0;
        uint256 len = pixelData.length;
        require(len <= MAX_INDIVIDUAL_PIXEL_ARRAY_LENGTH, "pixelData too large"); 

        if (len > 0) {
            // Do first set of pixels separately to initialise currentGroup
            for (uint256 currentIndex = 0; currentIndex < len - 1; currentIndex++) {
                require(checkIndividualPixelIndexes(pixelData[currentIndex]) == 0, "coord is out of range"); // coordinate is in 1920 x 1080 px resolution range
            }
            //assuming all individual pixel groups except the last have all 6 pixels filled
            pixelCount += (6 * (len - 1)); // 6 individual pixels per uint256

            //decode the last group and check the pixels individually to ensure pixel count is correct
            uint24[8] memory convertedPixels = decodeAndCheckIndividualPixelIndexes(pixelData[len - 1]);

            for (uint256 i = 0; i < convertedPixels.length; i++) {
                if (convertedPixels[i] != 0) {
                    pixelCount++;
                }
            }
        }

        len = pixelGroups.length;

        pixelCount += (len * NUMBER_PER_GROUP); // 32 pixels per group

        require(len <= NUM_OF_GROUPS, "pixel groups too large"); //Each slot in the data fits 32 px (2073600 / 32)
        len = pixelGroupIndexes.length;
        for (uint256 currentIndex = 0; currentIndex < len; currentIndex++) {
            require(checkGroupIndexes(pixelGroupIndexes[currentIndex]) == 0, "group is out of range"); // group is out of the 207360 range
        }

        return pixelCount;
    }

    function checkIndividualPixelIndexes(uint256 toCheck) internal pure returns (uint256 valid) {
        assembly {
            let converted := and(toCheck, 0x0000000000000000000000000000000000000000000000000000000000FFFFFF) // first is actually last 2 bytes in the byte array (uint256 converted to uint16)
            if gt(converted, MAX_PIXEL_RES) {
                valid := 1
            }

            mstore(0x1C, toCheck)
            converted := and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF)
            if gt(converted, MAX_PIXEL_RES) {
                valid := 1
            }

            mstore(0x18, toCheck)
            converted := and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF)
            if gt(converted, MAX_PIXEL_RES) {
                valid := 1
            }

            mstore(0x14, toCheck)
            converted := and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF)
            if gt(converted, MAX_PIXEL_RES) {
                valid := 1
            }

            mstore(0x10, toCheck)
            converted := and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF)
            if gt(converted, MAX_PIXEL_RES) {
                valid := 1
            }

            mstore(0x0C, toCheck)
            converted := and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF)
            if gt(converted, MAX_PIXEL_RES) {
                valid := 1
            }

            mstore(0x08, toCheck)
            converted := and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF)
            if gt(converted, MAX_PIXEL_RES) {
                valid := 1
            }

            mstore(0x04, toCheck)
            converted := and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF)
            if gt(converted, MAX_PIXEL_RES) {
                valid := 1
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

            mstore(0x1E, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x1C, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x1A, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x18, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x16, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x14, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x12, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x10, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x0E, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x0C, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x0A, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x08, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x06, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x04, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }

            mstore(0x02, toCheck)
            converted := and(mload(0), 0x000000000000000000000000000000000000000000000000000000000000FFFF)
            if gt(converted, NUM_OF_GROUPS) {
                valid := 1
            }
        }
    }
}
