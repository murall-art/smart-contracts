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

    // 0xFF00000000000000000000000000000000000000000000000000000000000000
    uint256 constant FIRST_1_BYTES_MASK = 115339776388732929035197660848497720713218148788040405586178452820382218977280;

    uint256 constant CONVERSION_SHIFT_FIRST_1_BYTES = 248;

    constructor(address[] memory admins) public {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }
    }

    function getTrait(TraitParameter traitParameter, uint256 traitHash) external override view returns (uint256) {
        uint256 offset = uint256(traitParameter) * 8;
        return (FIRST_1_BYTES_MASK & (traitHash << offset)) >> CONVERSION_SHIFT_FIRST_1_BYTES;
    }
}
