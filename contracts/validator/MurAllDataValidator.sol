pragma solidity ^0.6.0;

import {DataValidator} from "./DataValidator.sol";

contract MurAllDataValidator is DataValidator {
    uint256 constant MAX_PIXEL_RES = 2097152; // 2048 x 1024 pixels
    uint256 constant NUMBER_PER_GROUP = 32;
    uint256 constant NUM_OF_GROUPS = 65536; // 2097152 pixels / 32 pixels per group (max number in 4 bytes 0 - 65535)
    uint256 constant MAX_INDIVIDUAL_PIXEL_ARRAY_LENGTH = 262144; //Each slot in the data fits 8 px and 8 indexes (2097152 / 8)
    uint256 constant NUMBER_PER_INDEX_GROUP = 16;
    // 0x000000000000000000000000000000000000000000000000000000000000000F
    uint256 constant METADATA_HAS_ALPHA_CHANNEL_BYTES_MASK = 15;

    function validate(
        uint256[] memory pixelData,
        uint256[] memory pixelGroups,
        uint256[] memory pixelGroupIndexes,
        uint256[2] memory metadata
    ) public override pure returns (uint256 numberOfPixels) {
        uint256 pixelCount = 0;
        uint256 len = pixelData.length;
        require(len <= MAX_INDIVIDUAL_PIXEL_ARRAY_LENGTH, "pixelData too large");

        if (len > 0) {
            // Do first set of pixels separately to initialise currentGroup
            for (uint256 currentIndex = 0; currentIndex < len - 1; currentIndex++) {
                checkIndividualPixelIndexes(pixelData[currentIndex]);
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
        uint256 groupLen = pixelGroupIndexes.length;

        pixelCount += (len * NUMBER_PER_GROUP); // 32 pixels per group
        require(len <= NUM_OF_GROUPS, "pixel groups too large");

        (uint256 quotient, uint256 remainder) = getDivided(len, 16);

        if (remainder != 0) {
            quotient += 1; // e.g. when groupLen = 16, groupLen/16 = 1, we expect a group index length of 1 as 16 positions fit in 1 uint256
        }

        require(groupLen == quotient, "unexpected group index array length"); //Each group slot fits 16 coords of each 32 px group

        if (hasAlphaChannel(metadata[1])) {
            // don't count transparent pixels in pixel count
            for (uint256 currentIndex = 0; currentIndex < len; currentIndex++) {
                pixelCount -= checkGroupForZeroes(pixelGroups[currentIndex]);
            }
        }

        return pixelCount;
    }

    function getDivided(uint256 numerator, uint256 denominator)
        internal
        pure
        returns (uint256 quotient, uint256 remainder)
    {
        quotient = numerator / denominator;
        remainder = numerator - denominator * quotient;
    }

    function checkIndividualPixelIndexes(uint256 toCheck) internal pure {
        assembly {
            // first is actually last 2 bytes in the byte array (uint256 converted to uint16)
            if gt(and(toCheck, 0x0000000000000000000000000000000000000000000000000000000000FFFFFF), MAX_PIXEL_RES) {
                revert(0, 0) // coordinate is in 2048 x 1024 px resolution range
            }

            mstore(0x1C, toCheck)
            if gt(and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF), MAX_PIXEL_RES) {
                revert(0, 0) // coordinate is in 2048 x 1024 px resolution range
            }

            mstore(0x18, toCheck)
            if gt(and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF), MAX_PIXEL_RES) {
                revert(0, 0) // coordinate is in 2048 x 1024 px resolution range
            }

            mstore(0x14, toCheck)
            if gt(and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF), MAX_PIXEL_RES) {
                revert(0, 0) // coordinate is in 2048 x 1024 px resolution range
            }

            mstore(0x10, toCheck)
            if gt(and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF), MAX_PIXEL_RES) {
                revert(0, 0) // coordinate is in 2048 x 1024 px resolution range
            }

            mstore(0x0C, toCheck)
            if gt(and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF), MAX_PIXEL_RES) {
                revert(0, 0) // coordinate is in 2048 x 1024 px resolution range
            }

            mstore(0x08, toCheck)
            if gt(and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF), MAX_PIXEL_RES) {
                revert(0, 0) // coordinate is in 2048 x 1024 px resolution range
            }

            mstore(0x04, toCheck)
            if gt(and(mload(0), 0x0000000000000000000000000000000000000000000000000000000000FFFFFF), MAX_PIXEL_RES) {
                revert(0, 0) // coordinate is in 2048 x 1024 px resolution range
            }
        }
    }

    function hasAlphaChannel(uint256 metadata) internal pure returns (bool) {
        return (METADATA_HAS_ALPHA_CHANNEL_BYTES_MASK & metadata) != 0;
    }

    function decodeAndCheckIndividualPixelIndexes(uint256 toCheck) internal pure returns (uint24[8] memory converted) {
        assembly {
            mstore(converted, toCheck) // first is actually last 3 bytes in the byte array (uint256 converted to uint24)

            mstore(0x1C, toCheck)
            mstore(add(converted, 0x20), mload(0))

            mstore(0x18, toCheck)
            mstore(add(converted, 0x40), mload(0))

            mstore(0x14, toCheck)
            mstore(add(converted, 0x60), mload(0))

            mstore(0x10, toCheck)
            mstore(add(converted, 0x80), mload(0))

            mstore(0x0C, toCheck)
            mstore(add(converted, 0xA0), mload(0))

            mstore(0x08, toCheck)
            mstore(add(converted, 0xC0), mload(0))

            mstore(0x04, toCheck)
            mstore(add(converted, 0xE0), mload(0))
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
        ); // coordinate is in 2048 x 1024 px resolution range
    }

    function checkGroupForZeroes(uint256 toCheck) internal pure returns (uint256 amountOfZeroes) {
        assembly {
            // first is actually last 2 bytes in the byte array (uint256 converted to uint16)
            if iszero(and(toCheck, 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x1F, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x1E, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x1D, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x1C, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x1B, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x1A, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x19, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x18, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x17, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x16, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x15, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x14, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x13, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x12, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x11, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x10, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x0F, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x0E, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x0D, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x0C, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x0B, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x0A, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x09, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x08, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x07, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x06, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x05, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x04, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x03, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x02, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x01, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }
        }
    }
}
