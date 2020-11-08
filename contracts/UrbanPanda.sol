// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "./interfaces/IUrbanPanda.sol";

contract UrbanPanda is ERC20, AccessControl, Pausable, IUrbanPanda {
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");

    constructor() public ERC20("Urban Panda", "$UP") {
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
        require(getRoleMemberCount(MINTER_ROLE) == 1, "Minter is not set");
        _;
    }

    modifier minterNotSet() {
        require(getRoleMemberCount(MINTER_ROLE) == 0, "Minter is already set");
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

    function isMinterSet() external view override returns (bool) {
        return getRoleMemberCount(MINTER_ROLE) == 1;
    }

    function setMinter() external override originIsAdmin minterNotSet {
        _setupRole(MINTER_ROLE, _msgSender());
    }

    function getMinter() public view override minterSet returns (address) {
        return getRoleMember(MINTER_ROLE, 0);
    }

    function mint(address account, uint256 amount) external override senderIsMinter {
        _mint(account, amount);
    }

    function unlock() external override originIsAdmin {
        _unpause();
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override allowTokenTransfer(from) {
        super._beforeTokenTransfer(from, to, amount);
    }
}
