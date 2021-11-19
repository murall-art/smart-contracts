// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import {MurAllFrame} from "./MurAllFrame.sol";
import {TraitSeedManager} from "./TraitSeedManager.sol";
import {MintManager} from "../distribution/MintManager.sol";

contract TestMurAllFrame is MurAllFrame {
    constructor(
        address[] memory admins,
        MintManager _mintManager,
        TraitSeedManager _traitSeedManager
    ) public MurAllFrame(admins, _mintManager, _traitSeedManager) {}

    function setTraitSeedManager(TraitSeedManager _traitSeedManager) public {
        traitSeedManager = _traitSeedManager;
    }

    function mintId(address _to, uint256 _id) public {
        _mint(_to, _id);
    }
}
