// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "./interfaces/IUrbanPanda.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/TokenTimelock.sol";

contract UrbanPandaLiquidityLock is TokenTimelock {
    constructor(IERC20 _token, uint256 _releaseTime) public TokenTimelock(_token, msg.sender, _releaseTime) {}
}
