// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "./IUniswapV2Oracle.sol";

interface IUniswapV2Helper {
    function sortTokens(address tokenA, address tokenB) external pure returns (address token0, address token1);

    function pairFor(address tokenA, address tokenB) external view returns (address pair);

    function getFactoryAddress() external view returns (address factory);

    function getRouterAddress() external view returns (address router);

    function getUniswapV2Oracle() external view returns (IUniswapV2Oracle oracle);
}