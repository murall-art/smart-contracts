pragma solidity ^0.6.0;

abstract contract DataValidator {
    function validateSinglePixelData(
        uint256[] calldata pixelData
    ) external virtual pure returns (uint256 numberOfPixels);
    
    function validatePixelGroupData(
        uint256[] calldata pixelGroups,
        uint256[] calldata pixelGroupIndexes
    ) external virtual pure returns (uint256 numberOfPixels);
    
    function validateTransparentPixelGroupData(
        uint256[] calldata transparentPixelGroups,
        uint256[] calldata transparentPixelGroupIndexes,
        uint256[2] calldata metadata
    ) external virtual pure returns (uint256 numberOfPixels);
}
