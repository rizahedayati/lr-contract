// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.6;

/**
 * @title LRT Stake Interface
 * @dev This interface defines the methods and events for managing staking on the LRTStaking contract.
 */
interface ILRTStaking {
    // Struct to represent a user's staking schedule.
    struct UserStake {
        uint8 duration; // Duration The duration of the staking schedule in months.
        uint16 apr; // The annual percentage rate (APR) for the staking schedule when the user staking schedule started.
        uint64 startDate; // The timestamp when the staking schedule started.
        uint256 stakedAmount; // The amount of tokens staked by the user.
        uint256 claimedAmount; // claimedAmount The amount of tokens claimed by the user from the staking schedule.
        uint256 rewardAmount; // rewardAmount The total reward amount for the staking schedule.
    }

    /**
     * @dev Emitted when a user stakes tokens.
     * @param staker The address of the staker.
     * @param duration The Id of the staked token.
     * @param amount The amount of tokens staked.
     * @param index The index of the staking schedule.
     * @param rewardAmount The total reward amount for the staking schedule.
     * @param apr The annual percentage rate (APR) for the staking schedule when the user staking schedule started.
     */
    event LRTStaked(
        address indexed staker,
        uint256 amount,
        uint8 duration,
        uint16 index,
        uint256 rewardAmount,
        uint16 apr
    );

    /**
     * @dev Emitted when a user unstakes tokens.
     * @param staker The address of the staker.
     * @param index The index of the staking schedule.
     * @param amount The amount of tokens staked.
     */
    event LRTUnStaked(address indexed staker, uint16 index, uint256 amount);

    /**
     * @dev Emitted when the treasury address is updated.
     * @param treasury The new treasury address.
     */
    event TreasuryAddressUpdated(address treasury);

    /**
     * @dev Emitted when the APR is updated.
     * @param duration The duration of the staking schedule in months.
     * @param apr The annual percentage rate (APR) for the staking schedule.
     */
    event UpdatedAPR(uint8 duration, uint16 apr);

    /**
     * @dev Emitted when the stake capacity is updated.
     * @param stakeCapacity The maximum stake capacity.
     */
    event UpdatedStakeCapacity(uint256 stakeCapacity);

    /**
     * @dev Emitted when the threshold is updated.
     * @param threshold The threshold amount.
     */
    event UpdatedThreshold(uint256 threshold);

    /**
     * @dev Emitted when the duration is updated.
     * @param duration The duration in months.
     * @param isActive A boolean indicating whether the duration is valid or not.
     */
    event UpdatedDurations(uint8 duration, bool isActive);

    /**
     * @dev Emitted when the duration limit is updated.
     * @param durationLimit The duration limit in seconds.
     */
    event UpdatedDurationLimit(uint64 durationLimit);

    /**
     * @dev Emitted when a user unstakes tokens.
     * @param staker The address of the staker.
     * @param index The index of the staking schedule.
     * @param amount The amount of tokens staked.
     */
    event StakedRewardClaimed(
        address indexed staker,
        uint16 index,
        uint256 amount
    );

    /**
     * @dev Initializes the LRTStake contract.
     * @param _accessRestriction The address of the AccessRestriction contract.
     * @param _lrt The address of the LRT contract.
     */
    function initializeLRTStake(
        address _accessRestriction,
        address _lrt
    ) external;

    /**
     * @dev Sets the treasury address.
     * @param _address The new treasury address to set.
     */
    function setTreasuryAddress(address _address) external;

    /**
     * @dev Sets the annual percentage rate (APR) for a specific duration.
     * @param duration The duration of the staking schedule in months.
     * @param apr The annual percentage rate (APR) for the staking schedule.
     */
    function setAPR(uint8 duration, uint16 apr) external;

    /**
     * @dev Sets the valid durations for staking.
     * @param _duration The duration in months.
     * @param _isActive A boolean indicating whether the duration is valid or not.
     */
    function setDurations(uint8 _duration, bool _isActive) external;

    /**
     * @dev Sets the maximum stake capacity allowed by the contract.
     * @param _stakeCapacity The maximum stake capacity.
     */
    function setStakeCapacity(uint256 _stakeCapacity) external;

    /**
     * @dev Sets the threshold amount required for staking.
     * @param _threshold The threshold amount.
     */
    function setThreshold(uint256 _threshold) external;

    /**
     * @dev Sets the duration limit for staking.
     * @param _durationLimit The duration limit in seconds.
     */
    function setDurationLimit(uint64 _durationLimit) external;

    /**
     * @dev Stakes a specific token.
     * @param amount The Id of the token to stake.
     * @param duration The quantity of tokens staked.
     */
    function stake(uint256 amount, uint8 duration) external;

    /**
     * @dev Unstakes a specific token.
     * @param _index The index of the staking schedule.
     */
    function unstake(uint16 _index) external;

    /**
     * @dev Claims rewards for a specific staking schedule.
     * @param _index The index of the staking schedule.
     */
    function claim(uint16 _index) external;

    /**
     * @dev Gets the treasury address.
     * @return The current treasury address.
     */
    function treasury() external view returns (address);

    /**
     * @dev Retrieves the annual percentage rate (APR) for a specific staking duration.
     * @param _duration The duration for which to retrieve the APR.
     * @return apr The APR for the specified duration.
     */
    function APRs(uint8 _duration) external view returns (uint16 apr);

       /**
     * @dev Returns the stake capacity of the contract for all users.
     * @return The stake capacity.
     */
    function stakeCapacity() external view returns (uint256);

    /**
     * @dev Returns the threshold value.
     * @return The threshold value.
     */
    function threshold() external view returns (uint256);

    /**
     * @dev Returns the total value locked (TVL) in the contract.
     * @return The TVL.
     */
    function tvl() external view returns (uint256);

    /**
     * @dev Returns the duration limit.
     * @return The duration limit.
     */
    function durationLimit() external view returns (uint64);

    /**
     * @dev Returns staking data for a user's stake.
     * @param _user The Id of the staked token.
     * @param _index The Id of the staked token.
     * @return duration The quantity of tokens staked.
     * @return apr The annual percentage rate (APR) for the staking schedule when the user staking schedule started.
     * @return startDate The Id of the staked token.
     * @return stakedAmount The quantity of claimed planet.
     * @return claimedAmount The amount of tokens claimed by the user from the staking schedule.
     * @return rewardAmount The total reward amount for the staking schedule.
     */
    function userStakes(
        address _user,
        uint16 _index
    )
        external
        view
        returns (
            uint8 duration,
            uint16 apr,
            uint64 startDate,
            uint256 stakedAmount,
            uint256 claimedAmount,
            uint256 rewardAmount
        );

    /**
     * @dev Retrieves the number of staking schedules for a user.
     * @param _user The address of the user.
     * @return userStakingCount The number of staking schedules for the user.
     */
    function userStat(
        address _user
    ) external view returns (uint16 userStakingCount);

    /**
     * @dev Indicates which durations are valid to stake.
     * @param _duration The quantity of tokens staked.
     * @return hasSet Indicates whether the specified duration is set in the mapping.
     */
    function durations(uint8 _duration) external view returns (bool hasSet);
}