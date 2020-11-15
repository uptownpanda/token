// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUptownPandaFarm {
    function startFarming() external;

    function stake(uint256 _amount) external;

    function withdraw(uint256 _amount) external;

    function claim() external;
}
