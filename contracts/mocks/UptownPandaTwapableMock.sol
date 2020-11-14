// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "../UptownPandaTwapable.sol";

contract UptownPandaTwapableMock is UptownPandaTwapable {
    function initializeTwap(address _oracle) external {
        _initializeTwap(true, address(0), _oracle);
    }

    function updateTwap() external {
        _updateTwap();
    }

    function setListingTwap() external {
        _setListingTwap();
    }

    function getListingPrice() external pure returns (uint256) {
        return _getListingPrice();
    }
}
