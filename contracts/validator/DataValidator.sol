pragma solidity ^0.6.0;

abstract contract DataValidator {
    function validate(
        uint256[] calldata pixelData,
        uint256[] calldata pixelGroups,
        uint256[] calldata pixelGroupIndexes,
        uint256[2] calldata metadata,
        uint256[] calldata pixelGroupTransparencyHint
    ) external virtual pure returns (uint256 numberOfPixels);
}
