// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import {IFrameTraitManager} from "./IFrameTraitManager.sol";

/**
 * MurAll Frame contract
 */
contract FrameTraitManager is AccessControl, IFrameTraitManager {
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    using Strings for uint256;

    // 0xFFFFFF0000000000000000000000000000000000000000000000000000000000
    uint256 constant FIRST_3_BYTES_MASK = 115792082335569848633007197573932045576244532214531591869071028845388905840640;
    // 0xFFFF000000000000000000000000000000000000000000000000000000000000
    uint256 constant FIRST_2_BYTES_MASK = 115790322390251417039241401711187164934754157181743688420499462401711837020160;
    // 0xFF00000000000000000000000000000000000000000000000000000000000000
    uint256 constant FIRST_1_BYTES_MASK = 115339776388732929035197660848497720713218148788040405586178452820382218977280;

    uint256 constant CONVERSION_SHIFT_FIRST_1_BYTES = 248;
    uint256 constant CONVERSION_SHIFT_FIRST_2_BYTES = 240;
    uint256 constant CONVERSION_SHIFT_FIRST_3_BYTES = 232;

    constructor(address[] memory admins) public {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }
    }

    function getStyle(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & traitHash) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getMainColour(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 8)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getAccentColour(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 16)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    /**
        Get the frame corner variation depending on the frame style
     */
    function getCorner(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 24)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    /** 
    Get the frame condition depending on the frame style
    Choice of: Cracked, Weathered, Scratched, Pristine, Shimmering, Pixelated
    */
    function getCondition(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 32)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    /**
    Get the frame effect depending on the frame style
    Choice of: Electrified, Fiery, Watery/Wet, Abandoned/Plant Life Growing-Vines,
    */
    function getEffect1(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 40)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    /**
    Get the frame effect depending on the frame style
    Choice of: Electrified, Fiery, Watery/Wet, Abandoned/Plant Life Growing-Vines,
    */
    function getEffect2(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 48)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }
    
    /**
    Get the frame effect depending on the frame style
    Choice of: Electrified, Fiery, Watery/Wet, Abandoned/Plant Life Growing-Vines,
    */
    function getEffect3(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 56)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    /**
    Get the top decorations depending on the frame style
    Choice of: Cat, Gun, Spray Can etc
    */
    function getTopDecorationType(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 64)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    /**
    Get the top variation depending on the frame style
    Choice of: Cat glowing eyes, Laser eyes legendary, Weighted so legendary harder to get
    */
    function getTopDecorationVariation(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 72)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getTopDecorationColour(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 80)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    /**
    Get the top offset depending on the frame style
    Choice of: 30% to 70%
    */
    function getTopDecorationOffset(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 88)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getBottomDecorationType(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 96)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getBottomDecorationVariation(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 104)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getBottomDecorationColour(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 112)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getBottomDecorationOffset(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 120)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getLeftDecorationType(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 128)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getLeftDecorationVariation(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 136)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getLeftDecorationColour(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 144)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getLeftDecorationOffset(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 152)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getRightDecorationType(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 160)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getRightDecorationVariation(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 168)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getRightDecorationColour(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 176)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }

    function getRightDecorationOffset(uint256 traitHash) external override view returns (uint256) {
        return (FIRST_1_BYTES_MASK & (traitHash << 184)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }
}
