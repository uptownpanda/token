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
    event RewardCalculationDataRetrieved(
        uint256 currentReward,
        uint256 totalIntervalReward,
        uint256 intervalChunkLength,
        uint256 halvingInterval,
        uint256 stakedAmount,
        uint256 totalAmount
    );

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
        upTokenAddress = _upToken;
        farmTokenAddress = _farmToken;
        upToken = IERC20(_upToken);
        farmToken = IERC20(_farmToken);
        initialFarmUpSupply = _initialFarmUpSupply;
        addSupplySnapshot(0, block.timestamp, 0);
        hasFarmingStarted = true;
    }

    function stake(uint256 _amount) external override farmStarted stakeAddressIsValid stakeAmountIsValid(_amount) {
        claimReward(true, _amount);
        farmToken.transferFrom(msg.sender, address(this), _amount);
        balances[msg.sender] = balances[msg.sender].add(_amount);
    }

    function withdraw(uint256 _amount) external override farmStarted withdrawAmountIsValid(_amount) {
        claimReward(false, _amount);
        farmToken.transfer(msg.sender, _amount);
        balances[msg.sender] = balances[msg.sender].sub(_amount);
    }

    function claim() external override farmStarted {
        claimReward(false, 0); // just update supply snapshot with the same amount
    }

    function claimReward(bool _shouldAdd, uint256 _amount) private {
        updateSupplySnapshots(_shouldAdd, _amount);

        if (!rewardInitialized[msg.sender]) {
            rewards[msg.sender] = Reward(0, supplySnapshots.length.sub(1));
            rewardInitialized[msg.sender] = true;
            return;
        }

        uint256 rewardToAdd = 0;
        for (uint256 i = rewards[msg.sender].supplySnapshotIdx; i < supplySnapshots.length.sub(1); i++) {
            uint256 intervalChunkLength = supplySnapshots[i + 1].timestamp.sub(supplySnapshots[i].timestamp);
            uint256 totalIntervalReward = getTotalIntervalReward(supplySnapshots[i].intervalIdx);
            emit RewardCalculationDataRetrieved(
                rewardToAdd,
                totalIntervalReward,
                intervalChunkLength,
                HALVING_INTERVAL,
                balances[msg.sender],
                supplySnapshots[i].amount
            );
            rewardToAdd = rewardToAdd.add(
                totalIntervalReward.mul(intervalChunkLength).div(HALVING_INTERVAL).mul(balances[msg.sender]).div(
                    supplySnapshots[i].amount
                )
            );
        }

        uint256 amountToClaim = rewards[msg.sender].amount.add(rewardToAdd);
        if (amountToClaim > 0) {
            upToken.transfer(msg.sender, amountToClaim);
            rewards[msg.sender].amount = 0;
        }
    }

    function updateSupplySnapshots(bool _shouldAdd, uint256 _amount) private {
        uint256 currentTotalSupply = getTotalSupply();
        uint256 newTotalSupply = _shouldAdd ? currentTotalSupply.add(_amount) : currentTotalSupply.sub(_amount);

        SupplySnapshot storage latestSnapshot = supplySnapshots[supplySnapshots.length.sub(1)];
        if (latestSnapshot.timestamp >= block.timestamp) {
            latestSnapshot.amount = newTotalSupply;
            emit SupplySnapshotUpdated(
                supplySnapshots.length.sub(1),
                latestSnapshot.intervalIdx,
                latestSnapshot.timestamp,
                latestSnapshot.amount
            );
            return;
        }

        uint256 firstSnapshotTimestamp = supplySnapshots[0].timestamp;
        uint256 secondsSinceFirstSnapshot = block.timestamp.sub(firstSnapshotTimestamp);
        uint256 currentIntervalIdx = secondsSinceFirstSnapshot.div(HALVING_INTERVAL);

        uint256 newSnapshotsCount = currentIntervalIdx.sub(latestSnapshot.intervalIdx);
        bool isNewSnapshotAtHalvingPoint = secondsSinceFirstSnapshot.mod(HALVING_INTERVAL) == 0;
        if (!isNewSnapshotAtHalvingPoint) {
            newSnapshotsCount = newSnapshotsCount.add(1);
        }

        if (newSnapshotsCount == 1) {
            addSupplySnapshot(currentIntervalIdx, block.timestamp, newTotalSupply);
            return;
        }

        uint256 intervalIdxTracker = latestSnapshot.intervalIdx;
        uint256 timestampTracker = firstSnapshotTimestamp.add(intervalIdxTracker.mul(HALVING_INTERVAL));
        for (uint256 i = 0; i < newSnapshotsCount; i++) {
            intervalIdxTracker = intervalIdxTracker.add(1);
            timestampTracker = Math.min(timestampTracker.add(HALVING_INTERVAL), block.timestamp);
            addSupplySnapshot(intervalIdxTracker, timestampTracker, newTotalSupply);
        }
    }

    function addSupplySnapshot(
        uint256 _intervalIdx,
        uint256 _timestamp,
        uint256 _amount
    ) private {
        supplySnapshots.push(SupplySnapshot(_intervalIdx, _timestamp, _amount));
        emit SupplySnapshotAdded(_intervalIdx, _timestamp, _amount);
    }

    function getTotalSupply() public view returns (uint256) {
        return supplySnapshots.length > 0 ? supplySnapshots[supplySnapshots.length.sub(1)].amount : 0; // latest entry is current total supply
    }

    function getCurrentIntervalTotalReward() external view returns (uint256) {
        uint256 currentIntervalIdx = supplySnapshots.length == 0
            ? 0
            : block.timestamp.sub(supplySnapshots[0].timestamp).div(HALVING_INTERVAL);
        return getTotalIntervalReward(currentIntervalIdx);
    }

    function getTotalIntervalReward(uint256 _intervalIdx) private view returns (uint256) {
        uint256 totalIntervalReward = initialFarmUpSupply.div(2**_intervalIdx.add(1));
        return totalIntervalReward;
    }
}
