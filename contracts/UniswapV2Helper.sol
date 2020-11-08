// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "./interfaces/IUniswapV2Helper.sol";
import "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol";

contract UniswapV2Helper is IUniswapV2Helper {
    function sortTokens(address tokenA, address tokenB)
        external
        pure
        override
        returns (address token0, address token1)
    {
        return UniswapV2Library.sortTokens(tokenA, tokenB);
    }

    function pairFor(
        address factory,
        address tokenA,
        address tokenB
    ) external pure override returns (address pair) {
        return UniswapV2Library.pairFor(factory, tokenA, tokenB);
    }
}
