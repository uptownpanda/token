// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "../UptownPandaBurnable.sol";

contract UptownPandaBurnableMock is UptownPandaBurnable {
    bool private isWalletToWalletTransferMock;
    uint256 private listingPriceForBurnCalculationMock;
    uint256 private twapPriceForBurnCalculationMock;

    function _isWalletToWalletTransfer(address _sender, address _recipient)
        internal
        view
        virtual
        override
        returns (bool isWalletToWalletTransfer)
    {
        isWalletToWalletTransfer = (_sender == _recipient && _sender != _recipient) || isWalletToWalletTransferMock;
    }

    function _getListingPriceForBurnCalculation() internal view virtual override returns (uint256 listingPrice) {
        listingPrice = listingPriceForBurnCalculationMock;
    }

    function _getTwapPriceForBurnCalculation() internal virtual override returns (uint256 twapPrice) {
        twapPrice = twapPriceForBurnCalculationMock;
    }

    function logBuy(address _recipient, uint256 _amount) external {
        _logBuy(_recipient, _amount);
    }

    function setTestData(
        bool _isWalletToWalletTransferMock,
        uint256 _listingPriceForBurnCalculationMock,
        uint256 _twapPriceForBurnCalculationMock
    ) external {
        isWalletToWalletTransferMock = _isWalletToWalletTransferMock;
        listingPriceForBurnCalculationMock = _listingPriceForBurnCalculationMock;
        twapPriceForBurnCalculationMock = _twapPriceForBurnCalculationMock;
        _setDefaultBuyTimestamp();
    }

    function getAmountsToBurn(address _sender, uint256 _amount) external returns (uint256[] memory) {
        return _getAmountsToBurn(_sender, address(0), _amount);
    }
}
