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

    function getListingPriceMultiplier() external view override returns (uint256) {
        return LISTING_PRICE_MULTIPLIER;
    }

    function mint(address _account, uint256 _amount) external override senderIsMinter {
        _mint(_account, _amount);
    }

    function unlock() external override originIsAdmin {
        _unpause();
        _setListingTwap();
        _setDefaultBuyTimestamp();
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override {
        uint256[] memory amountsToBurn = _getAmountsToBurn(sender, recipient, amount);
        for (uint256 i = 0; i < amountsToBurn.length; i++) {
            _burn(sender, amountsToBurn[i]);
            amount = amount.sub(amountsToBurn[i]);
        }
        _logBuy(recipient, amount);
        super._transfer(sender, recipient, amount);
    }

    function _getNonBurnableSenders() internal view virtual override returns (address[] memory nonBurnableSenders) {
        nonBurnableSenders = new address[](3);
        nonBurnableSenders[0] = getMinter();
        nonBurnableSenders[1] = uniswapPair;
        nonBurnableSenders[2] = uniswapRouter;
    }

    function _getNonLoggableRecipients()
        internal
        view
        virtual
        override
        returns (address[] memory nonLoggableRecipients)
    {
        nonLoggableRecipients = new address[](1);
        nonLoggableRecipients[0] = uniswapPair;
    }

    function _isWalletToWalletTransfer(address _sender, address _recipient)
        internal
        view
        virtual
        override
        returns (bool isWalletToWalletTransfer)
    {
        isWalletToWalletTransfer = _sender != uniswapRouter && _recipient != uniswapPair;
    }

    function _getListingPriceForBurnCalculation() internal view virtual override returns (uint256 listingPrice) {
        return _getListingPrice();
    }

    function _getTwapPriceForBurnCalculation() internal virtual override returns (uint256 twapPrice) {
        _updateTwap();
        return currentTwap;
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

        bool isUrbanPandaToken0 = token0 == address(this);
        address oracle = uniswapV2Helper.getUniswapV2OracleAddress();
        _initializeTwap(isUrbanPandaToken0, uniswapPair, oracle);
    }
}
