// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.6;
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {IAccessRestriction} from "../../../access/IAccessRestriction.sol";
import {ILRTFuelStaking} from "./ILRTFuelStaking.sol";
import {ILRT} from "./../../../tokens/erc20/ILRT.sol";

// import "hardhat/console.sol";

/**
 * @title LRTFuelStaking Contract
 * @dev A contract to manages staking and rewards for LRTFuelStaking.
 */
contract LRTFuelStaking is
    Initializable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    ILRTFuelStaking
{
    // Defines the duration of the staking in terms of time
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

    /* @dev Reverts if duration is invalid
     */
    modifier onlyValidDuration(uint8 _duration) {
        require(durations[_duration], "LRTFuelStaking::Invalid duration");
        _;
    }

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @dev Initializes the FuelStake contract.
     * @param _accessRestriction The address of the access restriction contract.
     * @param _lrt The address of the LRT contract.
     */
    function initializeFuelStake(
        address _accessRestriction,
        address _lrt
    ) external override initializer {
        accessRestriction = IAccessRestriction(_accessRestriction);
        lrt = ILRT(_lrt);
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
            "LRTFuelStaking::Stake capacity not set"
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
        require(_threshold > 0, "LRTFuelStaking::Threshold not set");
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
            "LRTFuelStaking::Duration limit not set"
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
     * Emits a {LRTNFTStaked} event.
     */
    function stake(
        uint256 _amount,
        uint8 _duration
    ) external override onlyValidDuration(_duration) nonReentrant{
        // Ensure that the amount to be staked is greter than the threshold
        require(
            _amount >= threshold,
            "LRTFuelStaking::Amount must be greater than the threshold"
        );
        // Ensure that staking does not exceed the capacity
        require(
            _amount + tvl <= stakeCapacity,
            "LRTFuelStaking::Stake exceed capacity"
        );
        // Ensure that staking doesn't exceed the duration limit
        require(
            uint64(block.timestamp) <= durationLimit,
            "LRTFuelStaking::Stake exceed duration limit"
        );

        // Ensure that the contract has allowance to transfer tokens from the user
        require(
            lrt.allowance(msg.sender, address(this)) >= _amount,
            "LRTFuelStaking::Allowance error"
        );

        require(lrt.transferFrom(msg.sender, address(this), _amount),"LRTFuelStaking::Unsuccessful transfer to contract");


        // Adds a new staking schedule for the sender and updates their staking statistics.
        uint16 currentIndex = userStat[msg.sender];
        UserStake storage userStake = userStakes[msg.sender][currentIndex];
        userStake.duration = _duration;
        userStake.startDate = uint64(block.timestamp);
        userStake.stakedAmount = _amount;

        // Increment the user's staking statistics index
        userStat[msg.sender] += 1;

        // Increment the total value locked (TVL) by the specified _amount.
        tvl += _amount;

        emit LRTFuelStaked(msg.sender, _amount, _duration, currentIndex);
    }

    /**
     * @dev Allows users to unstake their tokens that have reached their maturity date from a specific index in their stake list.
     * @param index The index of the stake to unstake.
     * Requirements:
     * - The user must have staked tokens.
     * - The staking period for the tokens must have ended.
     * - The staked tokens must be claimable.
     * - The transfer of tokens to the user must be successful.
     * Emits a {LRTNFTUnStaked} event.
     */
    function unstake(uint16 index) external override nonReentrant {
        UserStake storage userStake = userStakes[msg.sender][index];

       uint256 unStakedAmount = 0;
        uint64 cuurentTime = uint64(block.timestamp);
        uint64 endDate = userStake.startDate + (userStake.duration * PERIOD);

        require(
            userStake.stakedAmount > 0,
            "LRTFuelStaking::You do not have any staking"
        );
        require(
            cuurentTime >= endDate,
            "LRTFuelStaking::Staking period not yet finished"
        );

        unStakedAmount = userStake.stakedAmount;
        tvl -= userStake.stakedAmount;
        userStake.stakedAmount = 0;


        require(
            lrt.balanceOf(address(this)) >= unStakedAmount,
            "LRTFuelStaking::Contract has not enough balance"
        );

        require(
            lrt.transfer(msg.sender, unStakedAmount),
            "LRTFuelStaking::Unsuccessful transfer"
        );
        // Emit an event to indicate that tokens have been unstaked
        emit LRTFuelUnStaked(msg.sender, index, unStakedAmount);
    }

    /**
     * @dev Authorizes a contract upgrade.
     * @param newImplementation The address of the new contract implementation.
     */
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}
}
