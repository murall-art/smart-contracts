// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.6.11;

import "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";

contract MockERC1155 is ERC1155 {
    constructor(string memory uri) public ERC1155(uri) {}

    function mint(
        address _to,
        uint256 _id,
        uint256 _amount
    ) public {
        _mint(_to, _id, _amount, "");
    }

    function mintMultiple(
        address[] memory _to,
        uint256[] memory _ids,
        uint256[] memory _amounts
    ) public {
        require(_ids.length == _amounts.length, "ERC1155: ids and amounts length mismatch");
        require(_to.length == _amounts.length, "ERC1155: addresses and amounts length mismatch");
        for (uint256 i = 0; i < _ids.length; i++) {
            _mint(_to[i], _ids[i], _amounts[i], "");
        }
    }

    function mintBatch(
        address _to,
        uint256[] memory _ids,
        uint256[] memory _amounts
    ) public {
        _mintBatch(_to, _ids, _amounts, "");
    }

    function burn(
        address _account,
        uint256 _id,
        uint256 _amount
    ) public {
        _burn(_account, _id, _amount);
    }

    function setURI(string memory newuri) public {
        _setURI(newuri);
    }
}
