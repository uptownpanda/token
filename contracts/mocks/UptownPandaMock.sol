// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract UptownPandaMock is ERC20 {
    constructor() public ERC20("Uptown Panda", "$UP") {}

    function setBalance(address _account, uint256 _amount) external {
        uint256 currentBalance = balanceOf(_account);
        _burn(_account, currentBalance);
        _mint(_account, _amount);
    }
}
