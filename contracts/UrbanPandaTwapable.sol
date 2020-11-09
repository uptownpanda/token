// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@uniswap/lib/contracts/libraries/FixedPoint.sol";
import "./interfaces/IUniswapV2Oracle.sol";

contract UrbanPandaTwapable {
    event TwapUpdated(uint256 newTwap, uint256 priceCumulative, uint32 blockTimestamp);

    using FixedPoint for *;

    bool private isInitialized;
    bool private useTokenAsCalculationBase; // if true pairToken/ourToken otherwise ourToken/pairToken
    bool private isTokenToken0; // is our token first after sorting
    IUniswapV2Oracle private oracle;

    uint256 public startingTwap; // price to set on initialization
    uint256 public twapCalculationInterval; // how often to recalculate
    uint32 public currentTwapTimestamp;
    uint256 public currentTwapPriceCumulative;
    uint256 public currentTwap;

    constructor() public {
        isInitialized = false;
    }

    modifier initialized() {
        require(isInitialized, "TWAP data required for calculation has not been set yet.");
        _;
    }

    function _initializeTwap(
        bool _useTokenAsCalculationBase,
        bool _isTokenToken0,
        uint256 _startingTwap,
        uint256 _twapCalculationInterval,
        IUniswapV2Oracle _oracle
    ) internal {
        useTokenAsCalculationBase = _useTokenAsCalculationBase;
        isTokenToken0 = _isTokenToken0;
        startingTwap = _startingTwap;
        twapCalculationInterval = _twapCalculationInterval;
        oracle = _oracle;
        isInitialized = true;
    }

    function _updateTwap(address uniswapPair) internal initialized {
        (uint256 price0Cumulative, uint256 price1Cumulative, uint32 blockTimestamp) = oracle.currentCumulativePrices(
            uniswapPair
        );

        uint32 timeElapsed = blockTimestamp - currentTwapTimestamp;
        if (timeElapsed < twapCalculationInterval) {
            return;
        }

        uint256 priceCumulative = _selectPriceCumulative(price0Cumulative, price1Cumulative);

        if (currentTwapTimestamp == 0) {
            currentTwap = startingTwap;
        } else {
            // cumulative price is in (uq112x112 price * seconds) units so we simply wrap it after division by time elapsed
            FixedPoint.uq112x112 memory newTwapAsFixedPoint = FixedPoint.uq112x112(
                uint224((priceCumulative - currentTwapPriceCumulative) / timeElapsed)
            );
            currentTwap = newTwapAsFixedPoint.mul(1 ether).decode144();
        }
        currentTwapTimestamp = blockTimestamp;
        currentTwapPriceCumulative = priceCumulative;

        emit TwapUpdated(currentTwap, currentTwapPriceCumulative, currentTwapTimestamp);
    }

    function _selectPriceCumulative(uint256 price0Cumulative, uint256 price1Cumulative) private view returns (uint256) {
        if (useTokenAsCalculationBase) {
            return isTokenToken0 ? price0Cumulative : price1Cumulative;
        }
        return isTokenToken0 ? price1Cumulative : price0Cumulative;
    }
}
