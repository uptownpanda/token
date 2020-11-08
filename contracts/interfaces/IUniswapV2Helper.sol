// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

interface IUniswapV2Helper {
    function sortTokens(address tokenA, address tokenB) external pure returns (address token0, address token1);

    function pairFor(address factory, address tokenA, address tokenB) external pure returns (address pair);
}