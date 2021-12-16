// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

contract MultiTokenSender is AccessControl {
    using SafeMath for uint256;
    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    uint256 public arrayLimit;

    event Multisended(uint256 total, address tokenAddress);

    fallback() external payable {}

    receive() external payable {}

    /** @dev Checks if sender address has admin role
     */
    modifier onlyAdmin() {
        require(hasRole(ADMIN_ROLE, msg.sender), "Does not have admin role");
        _;
    }

    constructor(address[] memory admins) public {
        for (uint256 i = 0; i < admins.length; ++i) {
            _setupRole(ADMIN_ROLE, admins[i]);
        }
        arrayLimit = 50;
    }

    function setArrayLimit(uint256 _newLimit) public onlyAdmin {
        require(_newLimit != 0, "Limit cannot be 0");
        arrayLimit = _newLimit;
    }

    function retrieveTokens(
        address token,
        address receiver,
        uint256 amount
    ) public onlyAdmin {
        ERC20 erc20token = ERC20(token);

        erc20token.transferFrom(address(this), receiver, amount);
    }

    function multisendErc20(
        address token,
        address[] memory _contributors,
        uint256[] memory _balances
    ) public payable {
        uint256 total = 0;
        require(_contributors.length <= arrayLimit, "too many addresses");
        ERC20 erc20token = ERC20(token);
        for (uint256 i = 0; i < _contributors.length; i++) {
            erc20token.transferFrom(msg.sender, _contributors[i], _balances[i]);
            total += _balances[i];
        }

        emit Multisended(total, token);
    }

    function multisendErc721(
        address token,
        address[] memory _contributors,
        uint256[] memory _tokenIds
    ) public payable {
        uint256 total = 0;
        require(_contributors.length <= arrayLimit, "too many addresses");
        require(_contributors.length == _tokenIds.length, "contributors and tokenIds must be the same length");

        for (uint256 i = 0; i < _contributors.length; i++) {
            IERC721(token).safeTransferFrom(msg.sender, _contributors[i], _tokenIds[i], "");
            total++;
        }

        emit Multisended(total, token);
    }

    function multisendErc1155(
        address token,
        address[] memory _contributors,
        uint256[] memory _tokenIds,
        uint256[] memory _tokenAmounts
    ) public payable {
        uint256 total = 0;
        require(_contributors.length <= arrayLimit, "too many addresses");
        require(_contributors.length == _tokenIds.length, "contributors and tokenIds must be the same length");
        require(_contributors.length == _tokenAmounts.length, "contributors and tokenAmounts must be the same length");
        
        for (uint256 i = 0; i < _contributors.length; i++) {
            IERC1155(token).safeTransferFrom(msg.sender, _contributors[i], _tokenIds[i], _tokenAmounts[i], "");
            total++;
        }

        emit Multisended(total, token);
    }

    function withdrawFunds(address payable _to) public onlyAdmin {
        (bool success, ) = _to.call{value: address(this).balance}("");
        require(success, "Failed to transfer the funds, aborting.");
    }
}
