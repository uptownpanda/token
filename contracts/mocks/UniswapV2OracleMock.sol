// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "../interfaces/IUniswapV2Oracle.sol";
import "@uniswap/v2-periphery/contracts/libraries/UniswapV2OracleLibrary.sol";

contract UniswapV2OracleMock is IUniswapV2Oracle {
    function currentBlockTimestamp() external view override returns (uint32) {
        return uint32(block.timestamp % 2**32);
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
        // returns token1/token0 = 100, token0/token1 = 0.01, timestamp = 0
        return (1 * 1e18, 1 * 1e16, 0);
    }
}
