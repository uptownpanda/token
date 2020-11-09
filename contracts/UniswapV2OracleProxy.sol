// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "./interfaces/IUniswapV2Oracle.sol";
import "@uniswap/v2-periphery/contracts/libraries/UniswapV2OracleLibrary.sol";

contract UniswapV2OracleProxy is IUniswapV2Oracle {
    function currentBlockTimestamp() external view override returns (uint32) {
        return UniswapV2OracleLibrary.currentBlockTimestamp();
    }

    function currentCumulativePrices(address pair)
        external
        view
        override
        returns (
            uint256 price0Cumulative,
            uint256 price1Cumulative,
            uint32 blockTimestamp
        )
    {
        return UniswapV2OracleLibrary.currentCumulativePrices(pair);
    }
}
