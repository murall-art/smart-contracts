// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

interface IFrameTraitManager {
    /**
    frame style 
    frame colour 
    accent 
    frame corner variation
    frame condition (cracked, weathered, scratched, pristine, shimmering, pixelate)
    frame effect (electrified, fiery, watery/wet, abandoned/plant life growing-vines,) 
    barcode/wave/generated thing from hash (1/1)
    top decorations (e.g. cat, gun, spray can etc)
    top variation (e.g. cat glowing eyes, laser eyes legendary, weighted so legendary harder to get)
    top colour (if not legendary, if legendary, pick from range instead)
    top offset (percent within range from 30% to 70%)
    x 4 (bottom, left, right)
     */
    /**
     Get the frame style
     Choice of: Denim, kintsugi, cyberpunk, 
     */
    function getStyle(uint256 traitHash) external view returns (uint256);

    function getMainColour(uint256 traitHash) external view returns (uint256);

    function getAccentColour(uint256 traitHash) external view returns (uint256);

    /**
        Get the frame corner variation depending on the frame style
     */
    function getCorner(uint256 traitHash) external view returns (uint256);

    /** 
    Get the frame condition depending on the frame style
    Choice of: Cracked, Weathered, Scratched, Pristine, Shimmering, Pixelated
    */
    function getCondition(uint256 traitHash) external view returns (uint256);

    /**
    Get the frame effect depending on the frame style
    Choice of: Electrified, Fiery, Watery/Wet, Abandoned/Plant Life Growing-Vines,
    */
    function getEffect1(uint256 traitHash) external view returns (uint256);

    /**
    Get the frame effect depending on the frame style
    Choice of: Electrified, Fiery, Watery/Wet, Abandoned/Plant Life Growing-Vines,
    */
    function getEffect2(uint256 traitHash) external view returns (uint256);

    /**
    Get the frame effect depending on the frame style
    Choice of: Electrified, Fiery, Watery/Wet, Abandoned/Plant Life Growing-Vines,
    */
    function getEffect3(uint256 traitHash) external view returns (uint256);

    /**
    Get the top decorations depending on the frame style
    Choice of: Cat, Gun, Spray Can etc
    */
    function getTopDecorationType(uint256 traitHash) external view returns (uint256);

    /**
    Get the top variation depending on the frame style
    Choice of: Cat glowing eyes, Laser eyes legendary, Weighted so legendary harder to get
    */
    function getTopDecorationVariation(uint256 traitHash) external view returns (uint256);

    function getTopDecorationColour(uint256 traitHash) external view returns (uint256);

    /**
    Get the top offset depending on the frame style
    Choice of: 30% to 70%
    */
    function getTopDecorationOffset(uint256 traitHash) external view returns (uint256);

    function getBottomDecorationType(uint256 traitHash) external view returns (uint256);

    function getBottomDecorationVariation(uint256 traitHash) external view returns (uint256);

    function getBottomDecorationColour(uint256 traitHash) external view returns (uint256);

    function getBottomDecorationOffset(uint256 traitHash) external view returns (uint256);

    function getLeftDecorationType(uint256 traitHash) external view returns (uint256);

    function getLeftDecorationVariation(uint256 traitHash) external view returns (uint256);

    function getLeftDecorationColour(uint256 traitHash) external view returns (uint256);

    function getLeftDecorationOffset(uint256 traitHash) external view returns (uint256);

    function getRightDecorationType(uint256 traitHash) external view returns (uint256);

    function getRightDecorationVariation(uint256 traitHash) external view returns (uint256);

    function getRightDecorationColour(uint256 traitHash) external view returns (uint256);

    function getRightDecorationOffset(uint256 traitHash) external view returns (uint256);
}
