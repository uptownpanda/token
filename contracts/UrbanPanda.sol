// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IUrbanPanda.sol";
import "./interfaces/IUniswapV2Helper.sol";

contract UrbanPanda is ERC20, AccessControl, Pausable, IUrbanPanda {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    address private uniswapPair = address(0);
    address private immutable uniswapV2Factory;
    IUniswapV2Helper private immutable uniswapV2Helper;

    constructor(address _uniswapV2Factory, address _uniswapV2Helper) public ERC20("Urban Panda", "$UP") {
        uniswapV2Factory = _uniswapV2Factory;
        uniswapV2Helper = IUniswapV2Helper(_uniswapV2Helper);
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

    modifier uniswapPairSet() {
        require(uniswapPair != address(0), "Uniswap pair $UP/ETH is not set.");
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
        return isMinterSet && isUniswapPairSet;
    }

    function initialize(address _minter, address _weth) external override originIsAdmin notInitialized {
        _setupRole(MINTER_ROLE, _minter);
        _setupUniswapPair(_weth);
    }

    function getMinter() public view override minterSet returns (address) {
        return getRoleMember(MINTER_ROLE, 0);
    }

    function getUniswapPair() public view override uniswapPairSet returns (address) {
        return uniswapPair;
    }

    function mint(address _account, uint256 _amount) external override senderIsMinter {
        _mint(_account, _amount);
    }

    function unlock() external override originIsAdmin {
        _unpause();
    }

    function _transfer(
        address sender,
        address recipient,
        uint256 amount
    ) internal virtual override {
        if (_shouldBurnTokens(sender)) {
            uint256 amountToBurn = _calculateAmountToBurn();
            _burn(sender, amountToBurn);
            amount = amount.sub(amountToBurn);
        }
        super._transfer(sender, recipient, amount);
    }

    function _shouldBurnTokens(address sender) private view returns (bool) {
        // TODO sender == StakingContract return false (when depositing withdrawing, claiming reward, don't charge anything!)
        return sender != getMinter() && sender != getUniswapPair();
    }

    function _calculateAmountToBurn() private pure returns (uint256) {
        // TODO
        return 0;
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override allowTokenTransfer(from) {
        super._beforeTokenTransfer(from, to, amount);
    }

    function _setupUniswapPair(address _weth) private {
        (address token0, address token1) = uniswapV2Helper.sortTokens(address(this), _weth);
        //bool isThisToken0 = token0 == address(this);
        uniswapPair = uniswapV2Helper.pairFor(uniswapV2Factory, token0, token1);
    }
}
