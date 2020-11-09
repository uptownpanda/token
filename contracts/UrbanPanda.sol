// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IUrbanPanda.sol";
import "./interfaces/IUniswapV2Helper.sol";
import "./UrbanPandaTwapable.sol";
import "./UrbanPandaBurnable.sol";

contract UrbanPanda is ERC20, AccessControl, Pausable, UrbanPandaTwapable, UrbanPandaBurnable, IUrbanPanda {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    uint256 public constant LISTING_PRICE_MULTIPLIER = 11;
    uint256 public constant MAX_BURN_PERCENT = 30;
    uint256 public constant MIN_BURN_PERCENT = 3;
    uint256 public constant WALLET_TO_WALLET_BURN_PERCENT = 5;
    uint256 public constant SELL_PENALTY_INTERVAL = 5 minutes;
    uint256 public constant TWAP_CALCULATION_INTERVAL = 10 minutes;

    mapping(address => uint256) private lastBuyTimestamps;
    uint256 private unlockTimestamp;

    address public uniswapPair;
    address public uniswapRouter;

    address public immutable uniswapV2HelperAddress;
    IUniswapV2Helper private immutable uniswapV2Helper;

    constructor(address _uniswapV2HelperAddress) public ERC20("Urban Panda", "$UP") {
        uniswapV2HelperAddress = _uniswapV2HelperAddress;
        uniswapV2Helper = IUniswapV2Helper(_uniswapV2HelperAddress);
        _setupRole(DEFAULT_ADMIN_ROLE, _msgSender());
        _pause();
    }

    modifier senderIsMinter() {
        require(hasRole(MINTER_ROLE, _msgSender()), "Sender does not have minter role.");
        _;
    }

    modifier originIsAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, tx.origin), "Original sender does not have admin role.");
        _;
    }

    modifier minterSet() {
        require(getRoleMemberCount(MINTER_ROLE) == 1, "Minter is not set.");
        _;
    }

    modifier notInitialized() {
        require(!isInitialized(), "Contract has already been initialized.");
        _;
    }

    modifier allowTokenTransfer(address from) {
        address minter = getMinter();
        bool isMsgSenderMinter = _msgSender() == minter; // this is needed for minting tokens to investors while tokens are locked
        bool isFromMinter = from == minter; // this is needed for liquidity pool transfer while tokens are locked
        require(!paused() || isMsgSenderMinter || isFromMinter, "Token transfer not allowed.");
        _;
    }

    function revokeRole(bytes32 role, address account) public virtual override {
        require(false, "No revoking allowed, bro!");
        super.revokeRole(role, account); // this is never reached, it's here to get rid of annoying warnings
    }

    function renounceRole(bytes32 role, address account) public virtual override {
        require(false, "No renouncing allowed, bro!");
        super.renounceRole(role, account); // this is never reached, it's here to get rid of annoying warnings
    }

    function grantRole(bytes32 role, address account) public virtual override {
        require(false, "No granting allowed, bro!");
        super.grantRole(role, account); // this is never reached, it's here to get rid of annoying warnings
    }

    function isInitialized() public view override returns (bool) {
        bool isMinterSet = getRoleMemberCount(MINTER_ROLE) == 1;
        bool isUniswapPairSet = uniswapPair != address(0);
        bool isUniswapRouterSet = uniswapRouter != address(0);
        return isMinterSet && isUniswapPairSet && isUniswapRouterSet;
    }

    function initialize(address _minter, address _weth) external override originIsAdmin notInitialized {
        _setupRole(MINTER_ROLE, _minter);
        _setupUniswap(_weth);
    }

    function getMinter() public view override minterSet returns (address) {
        return getRoleMember(MINTER_ROLE, 0);
    }

    function getLastBuyTimestamp(address _account) public view returns (uint256) {
        uint256 lastBuyTimestamp = lastBuyTimestamps[_account];
        return lastBuyTimestamp > 0 ? lastBuyTimestamp : unlockTimestamp;
    }

    function getListingPriceMultiplier() external view override returns (uint256) {
        return LISTING_PRICE_MULTIPLIER;
    }

    function mint(address _account, uint256 _amount) external override senderIsMinter {
        _mint(_account, _amount);
    }

    function unlock() external override originIsAdmin {
        unlockTimestamp = block.timestamp;
        _unpause();
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override {
        if (_shouldBurnTokens(sender)) {
            uint256 amountToBurn = _calculateAmountToBurn(sender, recipient, amount);
            _burn(sender, amountToBurn);
            amount = amount.sub(amountToBurn);
        }
        if (_shouldLogBuyTimestamp(recipient)) {
            lastBuyTimestamps[recipient] = now;
        }
        super._transfer(sender, recipient, amount);
    }

    function _shouldBurnTokens(address _sender) private view returns (bool) {
        // TODO sender == StakingContract return false (when depositing withdrawing, claiming reward, don't charge anything!)
        return _sender != getMinter() && _sender != uniswapPair && _sender != uniswapRouter;
    }

    function _calculateAmountToBurn(
        address _sender,
        address _recipient,
        uint256 _amount
    ) private returns (uint256) {
        // check for sell under 5 minutes
        uint256 lastBuyTimestamp = getLastBuyTimestamp(_sender);
        bool shouldBurnMaxAmount = (block.timestamp - lastBuyTimestamp) < SELL_PENALTY_INTERVAL;
        if (shouldBurnMaxAmount) {
            return _amount.mul(MAX_BURN_PERCENT).div(100);
        }

        // check if wallet to wallet transfer
        if (_isWalletToWalletTransfer(_sender, _recipient)) {
            return _amount.mul(WALLET_TO_WALLET_BURN_PERCENT).div(100);
        }

        // otherwise calculate by TWAP
        _updateTwap(uniswapPair);
        return 0;
    }

    function _isWalletToWalletTransfer(address _sender, address _recipient) private view returns (bool) {
        return _sender != uniswapRouter && _recipient != uniswapPair;
    }

    function _shouldLogBuyTimestamp(address _recipient) private view returns (bool) {
        // TODO sender != StakingContract (since returning from staking is not considered a buy)
        // TODO recipient != StakingContract (since staking is not considered a buy)
        return _recipient != uniswapPair;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override allowTokenTransfer(from) {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _setupUniswap(address _weth) private {
        (address token0, address token1) = uniswapV2Helper.sortTokens(address(this), _weth);
        uniswapPair = uniswapV2Helper.pairFor(token0, token1);
        uniswapRouter = uniswapV2Helper.getRouterAddress();

        bool useUrbanPandaAsCalculationBase = false; // we want to use ETH as calculation base -> $UP / ETH
        bool isUrbanPandaToken0 = token0 == address(this);
        uint256 startingTwap = LISTING_PRICE_MULTIPLIER * 1 ether;
        IUniswapV2Oracle oracle = uniswapV2Helper.getUniswapV2Oracle();
        _initializeTwap(
            useUrbanPandaAsCalculationBase,
            isUrbanPandaToken0,
            startingTwap,
            TWAP_CALCULATION_INTERVAL,
            oracle
        );
    }
}
