// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/introspection/ERC165.sol";
import {IRoyaltyGovernor} from "./IRoyaltyGovernor.sol";

contract RoyaltyGovernor is IRoyaltyGovernor, Ownable, AccessControl, ERC165 {
    using SafeMath for uint256;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public constant ROYALTY_PERCENTAGE_UPPER_LIMIT = 25;
    ///@dev bytes4(keccak256("royaltyInfo(uint256,uint256,bytes)")) == 0xc155531d
    bytes4 private constant _INTERFACE_ID_ERC2981 = 0xc155531d;
    uint256 royaltyPercentage;

    /** @dev Checks if sender address has admin role
     */
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Does not have admin role");
        _;
    }

    constructor(uint256 _initialRoyaltyPercentage, address[] memory admins) public {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }
        _registerInterface(_INTERFACE_ID_ERC2981);

        royaltyPercentage = _initialRoyaltyPercentage;
    }

    function setRoyaltyPercentage(uint256 _royaltyPercentage) external override onlyAdmin {
        royaltyPercentage = _royaltyPercentage;
    }

    function royaltyInfo(
        uint256 _tokenId,
        uint256 _value,
        bytes calldata _data
    )
        external
        override
        returns (
            address _receiver,
            uint256 _royaltyAmount,
            bytes memory _royaltyPaymentData
        )
    {}
}
