// SPDX-License-Identifier: MIT
pragma solidity ^0.6.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/math/SafeMath.sol";
import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "./interfaces/IUptownPandaFarm.sol";

contract UptownPandaFarm is IUptownPandaFarm {
    event SupplySnapshotAdded(uint256 intervalIdx, uint256 timestamp, uint256 totalAmount);
    event SupplySnapshotUpdated(uint256 idx, uint256 intervalIdx, uint256 timestamp, uint256 totalAmount);

    using Math for uint256;
    using SafeMath for uint256;
    using Address for address;

    uint256 public constant HALVING_INTERVAL = 10 days; // interval for halving the rewards in seconds

    bool public hasFarmingStarted = false; // indicates if farming has begun
    uint256 public initialFarmUpSupply; // inidicates how many $UP tokens were minted for the farm
    address public upTokenAddress; // $UP token address
    address public farmTokenAddress; // address of token to farm with

    IERC20 private upToken; // $UP IERC20 token
    IERC20 private farmToken; // farm IERC20 token

    address private owner;

    struct SupplySnapshot {
        uint256 intervalIdx;
        uint256 timestamp;
        uint256 amount;
    }

    struct Reward {
        uint256 amount;
        uint256 supplySnapshotIdx;
    }

    SupplySnapshot[] public supplySnapshots;
    mapping(address => uint256) public balances;

    mapping(address => Reward) private rewards;
    mapping(address => bool) private rewardInitialized;

    constructor() public {
        owner = msg.sender;
    }

    modifier originIsOwner() {
        require(owner == tx.origin, "Tx origin is not the owner of the contract.");
        _;
    }

    modifier farmNotStarted() {
        require(!hasFarmingStarted, "Farm has already been started.");
        _;
    }

    modifier farmStarted() {
        require(hasFarmingStarted, "Farm has not been started yet.");
        _;
    }

    modifier farmUpSupplySetCorrectly(address _upToken, uint256 supplyToCheck) {
        require(
            IERC20(_upToken).balanceOf(address(this)) == supplyToCheck,
            "Token supply for this farm is not set correctly!"
        );
        _;
    }

    modifier stakeAddressIsValid() {
        require(!address(msg.sender).isContract(), "Staking from contracts is not allowed.");
        _;
    }

    modifier stakeAmountIsValid(uint256 _amount) {
        require(_amount > 0, "Staking amount must be bigger than 0.");
        _;
    }

    modifier withdrawAmountIsValid(uint256 _amount) {
        require(_amount > 0, "Withdraw amount must be bigger than 0.");
        require(balances[msg.sender] >= _amount, "Requested amount is bigger than your balance.");
        _;
    }

    function startFarming(
        address _upToken,
        address _farmToken,
        uint256 _initialFarmUpSupply
    ) external override originIsOwner farmNotStarted farmUpSupplySetCorrectly(_upToken, _initialFarmUpSupply) {
        addSupplySnapshot(0, block.timestamp, 0);
        upTokenAddress = _upToken;
        farmTokenAddress = _farmToken;
        upToken = IERC20(_upToken);
        farmToken = IERC20(_farmToken);
        initialFarmUpSupply = _initialFarmUpSupply;
        hasFarmingStarted = true;
    }

    function stake(uint256 _amount) external override farmStarted stakeAddressIsValid stakeAmountIsValid(_amount) {
        claimReward(totalStakedSupply().add(_amount));
        farmToken.transferFrom(msg.sender, address(this), _amount);
        balances[msg.sender] = balances[msg.sender].add(_amount);
    }

    function withdraw(uint256 _amount) external override farmStarted withdrawAmountIsValid(_amount) {
        claimReward(totalStakedSupply().sub(_amount));
        farmToken.transfer(msg.sender, _amount);
        balances[msg.sender] = balances[msg.sender].sub(_amount);
    }

    function claim() external override farmStarted {
        claimReward(totalStakedSupply()); // just update supply snapshots with the same amount
    }

    function claimReward(uint256 _newTotalSupply) private {
        updateSupplySnapshots(_newTotalSupply);

        uint256 lastSupplySnapshotIdx = supplySnapshots.length.sub(1);

        if (!rewardInitialized[msg.sender]) {
            rewards[msg.sender] = Reward(0, lastSupplySnapshotIdx);
            rewardInitialized[msg.sender] = true;
            return;
        }

        uint256 recalculatedReward = rewards[msg.sender].amount;
        for (uint256 i = rewards[msg.sender].supplySnapshotIdx; i < lastSupplySnapshotIdx; i++) {
            recalculatedReward = recalculatedReward.add(calculateChunkRewardFromSupplySnapshot(i));
        }

        rewards[msg.sender].amount = recalculatedReward;
        rewards[msg.sender].supplySnapshotIdx = lastSupplySnapshotIdx;

        if (rewards[msg.sender].amount > 0) {
            upToken.transfer(msg.sender, rewards[msg.sender].amount);
            rewards[msg.sender].amount = 0;
        }
    }

    function updateSupplySnapshots(uint256 _newTotalSupply) private {
        uint256 latestSnapshotIdx = supplySnapshots.length.sub(1);
        SupplySnapshot storage latestSnapshot = supplySnapshots[latestSnapshotIdx];
        if (latestSnapshot.timestamp >= block.timestamp) {
            updateSupplySnapshot(latestSnapshotIdx, latestSnapshot, _newTotalSupply);
            return;
        }

        uint256 currentIntervalIdx = latestSnapshot.intervalIdx;
        while (true) {
            uint256 nextIntervalIdx = currentIntervalIdx.add(1);
            uint256 nextIntervalTimestamp = getIntervalTimestamp(nextIntervalIdx);
            uint256 snapshotIntervalIdx = block.timestamp < nextIntervalTimestamp
                ? currentIntervalIdx
                : nextIntervalIdx;
            uint256 snapshotTimestamp = Math.min(block.timestamp, nextIntervalTimestamp);
            addSupplySnapshot(snapshotIntervalIdx, snapshotTimestamp, _newTotalSupply);
            if (snapshotTimestamp == block.timestamp) {
                break;
            }
            currentIntervalIdx = nextIntervalIdx;
        }
    }

    function updateSupplySnapshot(
        uint256 _supplySnapshotIdx,
        SupplySnapshot storage _supplySnapshot,
        uint256 _newTotalSupply
    ) private {
        _supplySnapshot.amount = _newTotalSupply;
        emit SupplySnapshotUpdated(
            _supplySnapshotIdx,
            _supplySnapshot.intervalIdx,
            _supplySnapshot.timestamp,
            _supplySnapshot.amount
        );
    }

    function addSupplySnapshot(
        uint256 _intervalIdx,
        uint256 _timestamp,
        uint256 _amount
    ) private {
        supplySnapshots.push(SupplySnapshot(_intervalIdx, _timestamp, _amount));
        emit SupplySnapshotAdded(_intervalIdx, _timestamp, _amount);
    }

    function totalStakedSupply() public view returns (uint256) {
        return supplySnapshots.length > 0 ? supplySnapshots[supplySnapshots.length.sub(1)].amount : 0; // latest entry is current total supply
    }

    function claimable() external view returns (uint256) {
        if (!rewardInitialized[msg.sender] || supplySnapshots.length == 0) {
            return 0;
        }

        uint256 latestSupplySnapshotIdx = supplySnapshots.length.sub(1);
        uint256 claimableReward = rewards[msg.sender].amount;
        for (uint256 i = rewards[msg.sender].supplySnapshotIdx; i < latestSupplySnapshotIdx; i++) {
            claimableReward = claimableReward.add(calculateChunkRewardFromSupplySnapshot(i));
        }

        SupplySnapshot storage latestSupplySnapshot = supplySnapshots[latestSupplySnapshotIdx];
        uint256 currentIntervalIdx = latestSupplySnapshot.intervalIdx;
        uint256 currentTimestamp = latestSupplySnapshot.timestamp;
        while (true) {
            uint256 nextIntervalIdx = currentIntervalIdx.add(1);
            uint256 nextTimestamp = Math.min(block.timestamp, getIntervalTimestamp(nextIntervalIdx));
            uint256 intervalChunkLength = nextTimestamp.sub(currentTimestamp);
            claimableReward = claimableReward.add(
                calculateChunkReward(intervalChunkLength, currentIntervalIdx, latestSupplySnapshot.amount)
            );
            if (nextTimestamp == block.timestamp) {
                break;
            }
            currentIntervalIdx = nextIntervalIdx;
            currentTimestamp = nextTimestamp;
        }

        return claimableReward;
    }

    function calculateChunkRewardFromSupplySnapshot(uint256 supplySnapshotIdx) private view returns (uint256) {
        uint256 intervalChunkLength = supplySnapshots[supplySnapshotIdx.add(1)].timestamp.sub(
            supplySnapshots[supplySnapshotIdx].timestamp
        );
        return
            calculateChunkReward(
                intervalChunkLength,
                supplySnapshots[supplySnapshotIdx].intervalIdx,
                supplySnapshots[supplySnapshotIdx].amount
            );
    }

    function calculateChunkReward(
        uint256 _intervalChunkLength,
        uint256 _intervalIdx,
        uint256 _supplyAmount
    ) private view returns (uint256) {
        uint256 intervalTotalReward = getIntervalTotalReward(_intervalIdx);
        return
            intervalTotalReward.mul(_intervalChunkLength).div(HALVING_INTERVAL).mul(balances[msg.sender]).div(
                _supplyAmount
            );
    }

    function nextIntervalTimestamp() external view returns (uint256) {
        if (supplySnapshots.length == 0) {
            return 0;
        }
        uint256 currentIntervalIdx = block.timestamp.sub(supplySnapshots[0].timestamp).div(HALVING_INTERVAL);
        return getIntervalTimestamp(currentIntervalIdx.add(1));
    }

    function currentIntervalTotalReward() external view returns (uint256) {
        uint256 currentIntervalIdx = supplySnapshots.length == 0
            ? 0
            : block.timestamp.sub(supplySnapshots[0].timestamp).div(HALVING_INTERVAL);
        return getIntervalTotalReward(currentIntervalIdx);
    }

    function getIntervalTotalReward(uint256 _intervalIdx) private view returns (uint256) {
        return initialFarmUpSupply.div(2**_intervalIdx.add(1));
    }

    function getIntervalTimestamp(uint256 _intervalIdx) private view returns (uint256) {
        return supplySnapshots.length > 0 ? supplySnapshots[0].timestamp.add(HALVING_INTERVAL.mul(_intervalIdx)) : 0;
    }
}
