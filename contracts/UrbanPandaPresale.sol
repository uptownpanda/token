// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v2-periphery/contracts/interfaces/IUniswapV2Router02.sol";
import "./interfaces/IUrbanPanda.sol";
import "./interfaces/IUniswapV2Helper.sol";

contract UrbanPandaPresale is Ownable {
    using SafeMath for uint256;

    event InvestmentSucceeded(address sender, uint256 weiAmount, uint256 upAmount);

    mapping(address => bool) public whitelistAddresses; // all addresses eligible for presale
    mapping(address => uint256) public investments; // total WEI invested per address (1ETH = 1e18WEI)

    address public immutable urbanPandaAddress; // address of $UP token
    address public immutable uniswapRouterAddress; // address of uniswap router
    address public immutable liquidityLockAddress; // address where liquidity pool tokens will be locked for 2 years
    address payable public immutable teamAddress; // address where invested ETH will be transfered to

    uint256 public constant PRESALE_PRICE_MULTIPLIER = 3; // how many times more $UP presale investor receives vs listing price
    uint256 public constant INVESTMENT_LIMIT = 2 ether; // 2 ETH is maximum investment limit
    uint256 public presaleWeiSupplyLeft; // how many WEI are still available in presale

    bool public isPresaleActive = false; // investing is only allowed if presale is active
    bool public allowWhitelistAddressesOnly = true; // if true only addresses found on whitelist can participate
    bool public wasPresaleEnded = false; // indicates that presale is ended and liqudity is provided

    IUrbanPanda private immutable urbanPanda;
    IUniswapV2Router02 private immutable uniswapRouter;

    constructor(
        address _urbanPandaAddress,
        address _uniswapV2HelperAddress,
        address _liquidityLockAddress,
        address _teamAddress,
        uint256 _presaleEthSupply
    ) public {
        urbanPandaAddress = _urbanPandaAddress;
        urbanPanda = IUrbanPanda(_urbanPandaAddress);

        address resolvedUniswapRouterAddress = IUniswapV2Helper(_uniswapV2HelperAddress).getRouterAddress();
        uniswapRouterAddress = resolvedUniswapRouterAddress;
        uniswapRouter = IUniswapV2Router02(resolvedUniswapRouterAddress);

        liquidityLockAddress = _liquidityLockAddress;
        teamAddress = payable(_teamAddress);

        presaleWeiSupplyLeft = _presaleEthSupply * 1 ether;
    }

    function addWhitelistAddresses(address[] calldata _whitelistAddresses) external onlyOwner {
        for (uint256 i = 0; i < _whitelistAddresses.length; i++) {
            whitelistAddresses[_whitelistAddresses[i]] = true;
        }
    }

    function setIsPresaleActive(bool _isPresaleActive) external onlyOwner {
        if (_isPresaleActive && !urbanPanda.isInitialized()) {
            urbanPanda.initialize(address(this), uniswapRouter.WETH());
        }
        isPresaleActive = _isPresaleActive;
    }

    function setAllowWhitelistAddressesOnly(bool _allowWhitelistAddressesOnly) external onlyOwner {
        allowWhitelistAddressesOnly = _allowWhitelistAddressesOnly;
    }

    modifier presaleActive() {
        require(isPresaleActive, "Presale is currently not active.");
        _;
    }

    modifier presaleNotEnded {
        require(!wasPresaleEnded, "Presale was ended.");
        _;
    }

    modifier presaleContractIsMinter {
        require(urbanPanda.getMinter() == address(this), "Presale contract can't mint $UP tokens.");
        _;
    }

    modifier eligibleForPresale() {
        require(!allowWhitelistAddressesOnly || whitelistAddresses[_msgSender()], "Your address is not whitelisted.");
        _;
    }

    modifier presaleSupplyAvailable() {
        require(presaleWeiSupplyLeft > 0, "Presale cap has been reached.");
        _;
    }

    modifier presaleSupplyNotExceeded() {
        require(msg.value <= presaleWeiSupplyLeft, "The amount of ETH sent exceeds the ETH supply left in presale.");
        _;
    }

    receive()
        external
        payable
        presaleActive
        presaleNotEnded
        presaleContractIsMinter
        eligibleForPresale
        presaleSupplyAvailable
        presaleSupplyNotExceeded
    {
        uint256 addressTotalInvestment = investments[_msgSender()].add(msg.value);
        require(addressTotalInvestment <= INVESTMENT_LIMIT, "Max investment per address is 2 ETH.");

        uint256 listingPriceMultiplier = urbanPanda.getListingPriceMultiplier();
        uint256 upsToMint = msg.value.mul(listingPriceMultiplier).mul(PRESALE_PRICE_MULTIPLIER);
        urbanPanda.mint(_msgSender(), upsToMint);

        investments[_msgSender()] = addressTotalInvestment;
        presaleWeiSupplyLeft = presaleWeiSupplyLeft.sub(msg.value);

        emit InvestmentSucceeded(_msgSender(), msg.value, upsToMint);
    }

    function endPresale() external onlyOwner presaleNotEnded {
        uint256 listingPriceMultiplier = urbanPanda.getListingPriceMultiplier();
        uint256 liquidityPoolEths = address(this).balance.mul(60).div(100); // 60% goes to liquidity pool FOREVER
        uint256 liquidityPoolUps = liquidityPoolEths.mul(listingPriceMultiplier);

        urbanPanda.mint(address(this), liquidityPoolUps); // mint $UPs for liquidity pool and assign them to presale address
        urbanPanda.approve(address(uniswapRouter), liquidityPoolUps); // approve uniswap router to use $UPs from this address

        address upAddress = address(urbanPanda);
        uint256 transactionDeadline = block.timestamp + 5 minutes; // transaction should be confirmed in that timeframe
        uniswapRouter.addLiquidityETH{ value: liquidityPoolEths }(
            upAddress,
            liquidityPoolUps,
            liquidityPoolUps,
            liquidityPoolEths,
            liquidityLockAddress,
            transactionDeadline
        );

        teamAddress.transfer(address(this).balance); // remaining ETHs (40%) go to the team address
        urbanPanda.unlock(); // after liquidity is provided, tokens are unlocked
        wasPresaleEnded = true; // presale is ended so endPresale can't be called again
    }
}
