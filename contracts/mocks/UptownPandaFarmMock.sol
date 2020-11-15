// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "../UptownPandaFarm.sol";

contract UptownPandaFarmMock is UptownPandaFarm {
    function setHasFarmingStarted(bool _hasFarmingStarted) external {
        hasFarmingStarted = _hasFarmingStarted;
    }
}
