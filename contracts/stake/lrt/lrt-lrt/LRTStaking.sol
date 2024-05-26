// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.6;
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";

import {IAccessRestriction} from "../../../access/IAccessRestriction.sol";
import {ILRTStaking} from "./ILRTStaking.sol";
import {ILRT} from "./../../../tokens/erc20/ILRT.sol";

// import "hardhat/console.sol";

/**
 * @title LRTStaking Contract
 * @dev A contract to manages staking and rewards for LRTStaking.
 */
contract LRTStaking is
    Initializable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    ILRTStaking
{
    uint64 public constant PERIOD = uint64(30 days);
    IAccessRestriction public accessRestriction;
    ILRT public lrt;

    // Represents the stake capacity of the contract for all the users altogether.
    uint256 public override stakeCapacity;
    // Represents the threshold value.
    uint256 public override threshold;
    // Represents the total value locked (TVL) in the contract.
    uint256 public override tvl;
    // Represents the duration limit.
    uint64 public override durationLimit;


    // The address of the treasury where system fees for general transactions are sent.
    address public override treasury;

    // Maps APRs (Annual Percentage Rates) to their respective indexes.
    mapping(uint8 => uint16) public override APRs;

    // Maps user addresses to their respective stakes.
    mapping(address => mapping(uint16 => UserStake)) public override userStakes;

    // Staking stats by user
    mapping(address => uint16) public override userStat;

    // Valid durations of the staking
    mapping(uint8 => bool) public override durations;

    /**
     * @dev Reverts if the caller is not the owner.
     */
    modifier onlyOwner() {
        accessRestriction.ifOwner(msg.sender);
        _;
    }

    /**
     * @dev Modifier to restrict function access to admin users.
     */
    modifier onlyAdmin() {
        accessRestriction.ifAdmin(msg.sender);
        _;
    }

    /**
     * @dev Modifier to check if an address is valid.
     * @param _address The address to check.
     */
    modifier validAddress(address _address) {
        require(_address != address(0), "LRTStaking::Not valid address");
        _;
    }

    /* @dev Reverts if duration is invalid
     */
    modifier onlyValidDuration(uint8 _duration) {
        require(durations[_duration], "LRTStaking::Invalid duration");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the LRTStake contract.
     * @param _accessRestriction The address of the access restriction contract.
     * @param _lrt The address of the LRT contract.
     */
    function initializeLRTStake(
        address _accessRestriction,
        address _lrt
    ) external override initializer {
        accessRestriction = IAccessRestriction(_accessRestriction);
        lrt = ILRT(_lrt);
    }

    /**
     * @dev Sets the treasury address.
     * @param _treasury The new treasury address to set.
     */
    function setTreasuryAddress(
        address _treasury
    ) external override validAddress(_treasury) onlyAdmin {
        treasury = _treasury;
        emit TreasuryAddressUpdated(_treasury);
    }

    /**
     * @dev Sets the APR (Annual Percentage Rate) for a specific duration.
     * @param _duration The duration for which the APR is being set.
     * @param _apr The APR value to be set.
     * Requirements:
     * - The duration must be valid.
     * - Only the admin can call this function.
     */
    function setAPR(
        uint8 _duration,
        uint16 _apr
    ) external override onlyValidDuration(_duration) onlyAdmin {
        APRs[_duration] = _apr;
        emit UpdatedAPR(_duration, _apr);
    }

    /**
     * @dev Sets the valid durations for staking.
     * @param _duration The duration in months.
     * @param _isActive A boolean indicating whether the duration is valid or not.
     * - Only the admin can call this function.
     */
    function setDurations(
        uint8 _duration,
        bool _isActive
    ) external override onlyAdmin {
        durations[_duration] = _isActive;
        emit UpdatedDurations(_duration, _isActive);
    }

    /**
     * @dev Sets the maximum stake capacity allowed by the contract.
     * @param _stakeCapacity The maximum stake capacity.
     * - Only the admin can call this function.
     */
    function setStakeCapacity(
        uint256 _stakeCapacity
    ) external override onlyAdmin {
        require(
            _stakeCapacity > 0 && _stakeCapacity > tvl,
            "LRTStaking::Stake capacity not set"
        );
        stakeCapacity = _stakeCapacity;
        emit UpdatedStakeCapacity(_stakeCapacity);
    }

    /**
     * @dev Sets the threshold amount required for staking.
     * @param _threshold The threshold amount.
     * - Only the admin can call this function.
     */
    function setThreshold(uint256 _threshold) external override onlyAdmin {
        require(_threshold > 0, "LRTStaking::Threshold not set");
        threshold = _threshold;
        emit UpdatedThreshold(_threshold);
    }

    /**
     * @dev Sets the duration limit for staking.
     * @param _durationLimit The duration limit in seconds.
     * - Only the admin can call this function.
     */
    function setDurationLimit(
        uint64 _durationLimit
    ) external override onlyAdmin {
        require(
            _durationLimit > 0 && _durationLimit > uint64(block.timestamp),
            "LRTStaking::Duration limit not set"
        );
        durationLimit = _durationLimit;
        emit UpdatedDurationLimit(_durationLimit);
    }

    /**
     * @dev Allows users to stake tokens for a specified duration.
     * @param _amount The amount of tokens to stake.
     * @param _duration The duration for which the tokens will be staked.
     * Requirements: * - The duration must be valid.
     * - The amount must be greater than or equal to the threshold.
     * - The total value locked (TVL) plus the amount must not exceed the stake capacity.
     * - The current timestamp must be less than or equal to the duration limit.
     * - The contract must have sufficient allowance to transfer the tokens from the user.
     * - The transfer of tokens from the user to the contract must be successful.
     * Emits a {LRTStaked} event.
     */
    function stake(
        uint256 _amount,
        uint8 _duration
    ) external override onlyValidDuration(_duration) nonReentrant {
        // Ensure that the amount to be staked is greter than the threshold
        require(
            _amount >= threshold,
            "LRTStaking::Amount must be greater than the threshold"
        );
        // Ensure that staking does not exceed the capacity
        require(
            _amount + tvl <= stakeCapacity,
            "LRTStaking::Stake exceed capacity"
        );
        // Ensure that staking doesn't exceed the duration limit
        require(
            uint64(block.timestamp) <= durationLimit,
            "LRTStaking::Stake exceed duration limit"
        );

        require(APRs[_duration] > 0, "LRTStaking::APR not set");


        // Ensure that the contract has allowance to transfer tokens from the user
        require(
            lrt.allowance(msg.sender, address(this)) >= _amount,
            "LRTStaking::Allowance error"
        );
        require(lrt.transferFrom(msg.sender, address(this), _amount),"LRTStaking::Unsuccessful transfer to contract");

        // Calculate the reward amount based on the APR and taking duration
        uint256 rewardAmount = _claculateRewardToken(
            _amount,
            _duration,
            APRs[_duration]
        );

        // Adds a new staking schedule for the sender and updates their staking statistics.
        uint16 currentIndex = userStat[msg.sender];
        UserStake storage userStake = userStakes[msg.sender][currentIndex];
        userStake.duration = _duration;
        userStake.apr = APRs[_duration];
        userStake.startDate = uint64(block.timestamp);
        userStake.stakedAmount = _amount;
        userStake.claimedAmount = 0;
        userStake.rewardAmount = rewardAmount;

        tvl += _amount;
        // Increment the user's staking statistics index
        userStat[msg.sender] += 1;

        // Emit an event to indicate that tokens have been staked
        emit LRTStaked(
            msg.sender,
            _amount,
            _duration,
            currentIndex,
            rewardAmount,
            APRs[_duration]
        );

       
    }

    /**
     * @dev Allows users to unstake their tokens that have reached their maturity date from a specific index in their stake list.
     * @param index The index of the stake to unstake.
     * Requirements:
     * - The user must have staked tokens.
     * - The staking period for the tokens must have ended.
     * - The staked tokens must be claimable.
     * - The transfer of tokens to the user must be successful.
     * Emits a {LRTUnStaked} event.
     */
    function unstake(uint16 index) external override nonReentrant {
        // Get the current user stake
        UserStake storage userStake = userStakes[msg.sender][index];

        uint256 unStakedAmount = 0;
        uint64 cuurentTime = uint64(block.timestamp);
        uint64 endDate = userStake.startDate + (userStake.duration * PERIOD);

        require(
            userStake.stakedAmount > 0,
            "LRTStaking::You do not have any staking"
        );
        require(
            cuurentTime >= endDate,
            "LRTStaking::Staking period not yet finished"
        );

        unStakedAmount = userStake.stakedAmount;
        tvl -= userStake.stakedAmount;
        userStake.stakedAmount = 0;

        require(
            lrt.balanceOf(address(this)) >= unStakedAmount,
            "LRTStaking::Contract has not enough balance"
        );

        require(
            lrt.transfer(msg.sender, unStakedAmount),
            "LRTStaking::Unsuccessful transfer"
        );

        // Emit an event to indicate that tokens have been unstaked
        emit LRTUnStaked(msg.sender, index, unStakedAmount);
    }

    /**
     * @dev Allows a user to claim rewards for a specific staking schedule.
     * @param index The index of the staking schedule to claim rewards from.
     */
    function claim(uint16 index) external override nonReentrant {
        UserStake storage userStake = userStakes[msg.sender][index];

        uint64 cuurentTime = uint64(block.timestamp);

        // Check if the staking schedule is fully claimed
        require(
            userStake.claimedAmount < userStake.rewardAmount,
            "LRTStaking::The staking schedule is fully claimed"
        );

        uint256 availableRewardAmount = 0;
        uint256 currentRewardAmount = 0;
        // Check if the current time is past the staking start date
        if (cuurentTime >= (userStake.startDate + PERIOD)) {
            // Calculate the duration the stake has been active
            uint256 stakingDuration = cuurentTime - userStake.startDate;
            uint256 stakedmonths = stakingDuration / PERIOD;
            uint256 eligibleMonths = stakedmonths > userStake.duration
                ? userStake.duration
                : stakedmonths;

            availableRewardAmount =
                (userStake.rewardAmount * eligibleMonths) /
                userStake.duration;

            currentRewardAmount = availableRewardAmount >
                userStake.claimedAmount
                ? availableRewardAmount - userStake.claimedAmount
                : 0;

            userStake.claimedAmount += currentRewardAmount;
        }

        // Ensure that there are claimable tokens
        require(
            currentRewardAmount > 0,
            "LRTStaking::You do not have enough stake"
        );

        require(
            lrt.balanceOf(treasury) >= currentRewardAmount,
            "LRTStaking::Treasury has not enough balance"
        );

        require(
            lrt.transferFrom(treasury, msg.sender, currentRewardAmount),
            "LRTStaking::Unsuccessful transfer"
        );

        // Emit an event indicating that rewards have been claimed
        emit StakedRewardClaimed(msg.sender, index, currentRewardAmount);
    }

    /**
     * @dev Authorizes a contract upgrade.
     * @param newImplementation The address of the new contract implementation.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    /**
     * @dev Calculates the reward tokens for a staking schedule.
     * @param _amount The amount of tokens staked.
     * @param _duration The duration of the staking schedule in months.
     * @param _apr The annual percentage rate (APR) for the staking schedule.
     * @return rewardAmount The calculated reward amount for the staking schedule.
     */
    function _claculateRewardToken(
        uint256 _amount,
        uint8 _duration,
        uint16 _apr
    ) private pure returns (uint256) {
        // Calculate the reward amount based on the APR and taking duration
        uint256 rewardAmount = (_amount * _apr * _duration) / 120000; // APR/100 * months/12
        return rewardAmount;
    }
}
