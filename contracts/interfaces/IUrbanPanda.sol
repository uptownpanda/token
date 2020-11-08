// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUrbanPanda is IERC20 {
    function mint(address to, uint256 amount) external;

    function isMinterSet() external view returns (bool);

    function setMinter() external;

    function getMinter() external view returns (address);

    function unlock() external;
}
