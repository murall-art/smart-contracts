pragma solidity ^0.6.0;

import {DataValidator} from "./DataValidator.sol";

contract MurAllDataValidator is DataValidator {
    uint256 constant MAX_PIXEL_RES = 2097152; // 2048 x 1024 pixels
    uint256 constant NUMBER_PER_GROUP = 32;
    uint256 constant MAX_INDEX_WITHIN_GROUP = 31; // 32 positions nidexed 0 - 31
    uint256 constant NUM_OF_GROUPS = 65536; // 2097152 pixels / 32 pixels per group (max number in 2 bytes 0 - 65535)
    uint256 constant MAX_INDIVIDUAL_PIXEL_ARRAY_LENGTH = 262144; //Each slot in the data fits 8 px and 8 indexes (2097152 / 8)
    uint256 constant NUMBER_PER_INDEX_GROUP = 16;
    uint256 constant NUMBER_PER_INDIVIDUAL_PIXEL_GROUP = 8; // 8 individual pixels per uint256
    // 0x000000000000000000000000000000000000000000000000000000000000000F
    uint256 constant METADATA_HAS_ALPHA_CHANNEL_BYTES_MASK = 15;

    function validate(
        uint256[] memory pixelData,
        uint256[] memory pixelGroups,
        uint256[] memory pixelGroupIndexes,
        uint256[2] memory metadata,
        uint256[] memory pixelGroupTransparencyHint
    ) public override pure returns (uint256 numberOfPixels) {
        uint256 len = pixelGroups.length;

        uint256 pixelCount = (len * NUMBER_PER_GROUP); // 32 pixels per group
        require(len <= NUM_OF_GROUPS, "pixel groups too large");

        (uint256 quotient, uint256 remainder) = getDivided(len, 16);

        if (remainder != 0) {
            quotient += 1; // e.g. when groupLen = 16, groupLen/16 = 1, we expect a group index length of 1 as 16 positions fit in 1 uint256
        }

        require(pixelGroupIndexes.length == quotient, "unexpected group index array length"); //Each group slot fits 16 coords of each 32 px group

        if (hasAlphaChannel(metadata[1])) {
            uint256 currentGroup;
            len = pixelGroupTransparencyHint.length;
            // don't count transparent pixels in pixel count:
            // loop over the pixel groups checking for transparent pixels and deduct from total pixels
            for (uint256 i = 0; i < len; i++) {
                assembly {
                    // We know that we only access the array in bounds, so we can avoid the check.
                    // 0x20 needs to be added to an array because the first slot contains the
                    // array length.
                    currentGroup := mload(
                        add(
                            add(pixelGroups, 0x20),
                            mul(mload(add(add(pixelGroupTransparencyHint, 0x20), mul(i, 0x20))), 0x20)
                        )
                    )

                    // first is actually last 2 bytes in the byte array (uint256 converted to uint16)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(currentGroup, 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )
                    // iszero returns 1 if the value is equal to zero, or 0 if the value is any other number, so we use that to subtract from pixel count
                    mstore(0x1F, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x1E, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x1D, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x1C, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x1B, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x1A, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x19, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x18, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x17, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x16, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x15, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x14, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x13, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x12, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x11, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x10, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x0F, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x0E, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x0D, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x0C, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x0B, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x0A, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x09, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x08, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x07, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x06, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x05, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x04, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x03, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x02, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )

                    mstore(0x01, currentGroup)
                    pixelCount := sub(
                        pixelCount,
                        iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000000000FF))
                    )
                }
            }
        }

        len = pixelData.length;
        require(len <= MAX_INDIVIDUAL_PIXEL_ARRAY_LENGTH, "pixelData too large");

        if (len > 0) {
            //assuming all individual pixel groups except the last have all 8 pixels filled except the last group
            pixelCount +=
                (NUMBER_PER_INDIVIDUAL_PIXEL_GROUP * (len - 1)) +
                (NUMBER_PER_INDIVIDUAL_PIXEL_GROUP - checkIndividualPixelGroupForZeroes(pixelData[len - 1]));
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
            // iszero returns 1 if the value is equal to zero, or 0 if the value is any other number, so we use that to add to the count
            amountOfZeroes := add(
                amountOfZeroes,
                iszero(and(toCheck, 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF))
            )

            mstore(0x1C, toCheck)
            amountOfZeroes := add(
                amountOfZeroes,
                iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF))
            )

            mstore(0x18, toCheck)
            amountOfZeroes := add(
                amountOfZeroes,
                iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF))
            )

            mstore(0x14, toCheck)
            amountOfZeroes := add(
                amountOfZeroes,
                iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF))
            )

            mstore(0x10, toCheck)
            amountOfZeroes := add(
                amountOfZeroes,
                iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF))
            )

            mstore(0x0C, toCheck)
            amountOfZeroes := add(
                amountOfZeroes,
                iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF))
            )

            mstore(0x08, toCheck)
            amountOfZeroes := add(
                amountOfZeroes,
                iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF))
            )

            mstore(0x04, toCheck)
            amountOfZeroes := add(
                amountOfZeroes,
                iszero(and(mload(0), 0x00000000000000000000000000000000000000000000000000000000FFFFFFFF))
            )
        }
    }
}
