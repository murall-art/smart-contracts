pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";


contract PaintToken is ERC20, ERC20Burnable {
    uint256 public constant INITAL_SUPPLY = 21772800000;

    constructor() public ERC20("Paint", "PAINT") {
        _mint(_msgSender(), INITAL_SUPPLY * (10**uint256(decimals())));
    }
}
