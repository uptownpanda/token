// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "../UptownPandaFarm.sol";

contract UptownPandaFarmMock is UptownPandaFarm {
    constructor(
        uint256 _farmUpSupply,
        address _upTokenAddress,
        address _farmTokenAddress
    ) public UptownPandaFarm(_farmUpSupply, _upTokenAddress, _farmTokenAddress) {}

    function setHasFarmingStarted(bool _hasFarmingStarted) external {
        hasFarmingStarted = _hasFarmingStarted;
    }
}
