pragma solidity ^0.6.0;

import {DataValidator} from "./DataValidator.sol";

contract MurAllDataValidator is DataValidator {
    uint256 constant MAX_PIXEL_RES = 2097152; // 2048 x 1024 pixels
    uint256 constant NUMBER_PER_GROUP = 32;
    uint256 constant MAX_INDEX_WITHIN_GROUP = 31; // 32 positions nidexed 0 - 31
    uint256 constant NUM_OF_GROUPS = 65536; // 2097152 pixels / 32 pixels per group (max number in 4 bytes 0 - 65535)
    uint256 constant MAX_INDIVIDUAL_PIXEL_ARRAY_LENGTH = 262144; //Each slot in the data fits 8 px and 8 indexes (2097152 / 8)
    uint256 constant NUMBER_PER_INDEX_GROUP = 16;
    uint256 constant NUMBER_PER_INDIVIDUAL_PIXEL_GROUP = 8; // 8 individual pixels per uint256
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
            //assuming all individual pixel groups except the last have all 8 pixels filled except the last group
            pixelCount +=
                (NUMBER_PER_INDIVIDUAL_PIXEL_GROUP * (len - 1)) +
                (NUMBER_PER_INDIVIDUAL_PIXEL_GROUP - checkIndividualPixelGroupForZeroes(pixelData[len - 1]));
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

    function hasAlphaChannel(uint256 metadata) internal pure returns (bool) {
        return (METADATA_HAS_ALPHA_CHANNEL_BYTES_MASK & metadata) != 0;
    }

    function checkIndividualPixelGroupForZeroes(uint256 toCheck) public pure returns (uint256 amountOfZeroes) {
        assembly {
            // first is actually last 2 bytes in the byte array (uint256 converted to uint16)
            if iszero(and(toCheck, 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x1C, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x18, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x14, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x10, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x0C, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x08, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }

            mstore(0x04, toCheck)
            if iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF)) {
                amountOfZeroes := add(amountOfZeroes, 1)
            }
        }
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
