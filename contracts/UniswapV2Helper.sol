// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "./interfaces/IUniswapV2Helper.sol";
import "./interfaces/IUniswapV2Oracle.sol";
import "@uniswap/v2-periphery/contracts/libraries/UniswapV2Library.sol";

contract UniswapV2Helper is IUniswapV2Helper {
    address private immutable uniswapV2FactoryAddress;
    address private immutable uniswapV2Router02Address;
    IUniswapV2Oracle private immutable uniswapV2Oracle;

    constructor(
        address _uniswapV2Factory,
        address _uniswapV2Router02,
        address _uniswapV2Oracle
    ) public {
        uniswapV2FactoryAddress = _uniswapV2Factory;
        uniswapV2Router02Address = _uniswapV2Router02;
        uniswapV2Oracle = IUniswapV2Oracle(_uniswapV2Oracle);
    }

    function sortTokens(address tokenA, address tokenB)
        external
        pure
        override
        returns (address token0, address token1)
    {
        return UniswapV2Library.sortTokens(tokenA, tokenB);
    }

    function pairFor(address tokenA, address tokenB) external view override returns (address pair) {
        return UniswapV2Library.pairFor(uniswapV2FactoryAddress, tokenA, tokenB);
    }

    function getFactoryAddress() external view override returns (address factory) {
        return uniswapV2FactoryAddress;
    }

    function getRouterAddress() external view override returns (address router) {
        return uniswapV2Router02Address;
    }

    function getUniswapV2Oracle() external view override returns (IUniswapV2Oracle oracle) {
        return uniswapV2Oracle;
    }
}
