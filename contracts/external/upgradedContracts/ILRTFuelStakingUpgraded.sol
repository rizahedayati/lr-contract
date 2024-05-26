// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.6;

/**
 * @title Fuel Stake Interface
 * @dev This interface defines the methods and events for managing staking on the LRTFuelStakingUpgraded contract.
 */
interface ILRTFuelStakingUpgraded {
    //Struct Representing staking data for a specific token.
    struct UserStake {
        uint8 duration; // The duration of the stake in terms of how long the stake should be active
        uint64 startDate; // The start date of the stake as a timestamp
        uint256 stakedAmount; // The amount of tokens that the user has staked
    }

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
     * @notice Emitted when a staker locks LRT with fuel for a specified duration
     * @param staker The address of the staker performing the action
     * @param amount The amount of LRT tokens staked
     * @param duration The duration for which the LRT tokens are staked
     * @param index The index of the staking schedule.
     */
    event LRTFuelStaked(
        address indexed staker,
        uint256 amount,
        uint8 duration,
        uint16 index
    );

    /**
     * @dev Emitted when a user unstakes tokens.
     * @param staker The address of the staker.
     * @param amount The amount of tokens staked.
     * @param index The index of the staking schedule.
     */
    event LRTFuelUnStaked(address indexed staker, uint16 index, uint256 amount);

    /**
     * @dev Initializes the PlanetStake contract.
     * @param _accessRestriction The address of the AccessRestriction contract.
     * @param _lrt The address of the LRT contract.
     * @param _greeting The greeting message to be displayed on the marketplace.
     */
    function initializeFuelStake(
        address _accessRestriction,
        address _lrt,
        string memory _greeting
    ) external;

    /**
     * @dev Sets the valid durations for staking.
     * @param _duration The duration in months.
     * @param _isActive A boolean indicating whether the duration is valid or not.
     */
    function setDurations(uint8 _duration, bool _isActive) external;

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
     * @param _amount The Id of the token to stake.
     * @param _duration The quantity of tokens staked.
     */
    function stake(uint256 _amount, uint8 _duration) external;

    /**
     * @dev Unstakes a specific token.
     * @param _index The index of the staking schedule.
     */
    function unstake(uint16 _index) external;

    /**
     * @dev Sets the maximum stake capacity allowed by the contract.
     * @param _stakeCapacity The maximum stake capacity.
     * - Only the admin can call this function.
     */
    function setStakeCapacity(uint256 _stakeCapacity) external;

    /**
     * @dev This view function returns details about a specific stake made by a user
     * @param _user The address of the user whose stake information is being requested
     * @param _index The index of the specific stake to query within the user's stakes
     * @return duration The duration for which the tokens are staked
     * @return startDate The start date of the staking period as a timestamp
     * @return stakedAmount The amount of tokens that the user has staked
     */
    function userStakes(
        address _user,
        uint16 _index
    )
        external
        view
        returns (uint8 duration, uint64 startDate, uint256 stakedAmount);

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

    function greeting() external view returns (string memory);
}
