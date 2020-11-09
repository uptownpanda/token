// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

interface IUrbanPanda is IERC20 {
    function mint(address _account, uint256 _amount) external;

    function isInitialized() external view returns (bool);

    function initialize(address _minter, address _weth) external;

    function getMinter() external view returns (address);

    function unlock() external;

    function getListingPriceMultiplier() external view returns (uint256);
}
