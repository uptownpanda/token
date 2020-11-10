// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "../interfaces/IUniswapV2Oracle.sol";
import "@uniswap/v2-periphery/contracts/libraries/UniswapV2OracleLibrary.sol";

contract UniswapV2OracleMock is IUniswapV2Oracle {
    uint256 private priceCumulativeMock;
    uint32 private blockTimestampMock;

    function currentBlockTimestamp() external view override returns (uint32) {
        return 0;
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
        price0Cumulative = 0;
        price1Cumulative = priceCumulativeMock;
        blockTimestamp = blockTimestampMock;
    }

    function setTestData(uint256 _priceCumulative, uint32 _blockTimestamp) external {
        priceCumulativeMock = _priceCumulative;
        blockTimestampMock = _blockTimestamp;
    }
}
