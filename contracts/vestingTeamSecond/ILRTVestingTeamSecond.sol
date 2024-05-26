// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.6;

/**
 * @title ILRTVestingTeam Interface
 * @dev Interface for LRT vesting team contract
 */
interface ILRTVestingTeamSecond {
    /**
     * @dev User vesting schedule details
     */
    struct Vesting {
        uint64 startDate;
        uint256 vestedAmount;
        uint256 claimedAmount;
    }

    /**
     * @dev Emitted when vesting is claimed
     * @param amount Claimed amount
     * @param beneficiary Beneficiary address

     */
    event Claimed(address indexed beneficiary,uint256 amount);

    /**
     * @dev Emitted when vesting is revoked
     * @param amount Revoked amount
     * @param beneficiary Beneficiary address

     */
    event Revoked(address indexed beneficiary,uint256 amount);

    /**
     * @dev Emitted when vesting created
     * @param beneficiary Beneficiary
     * @param startDate Start timestamp
     * @param totalAmount Total vesting amount
     */
    event VestingCreated(
        address indexed beneficiary,
        uint64 startDate,
        uint256 totalAmount
    );

    // External functions

    /**
     * @dev Creates new vesting schedule
     * @param _beneficiary Beneficiary address
     * @param _amount Total vesting amount
     */
    function createVesting(address _beneficiary, uint256 _amount, uint64 startDate) external;

    /**
     * @dev Revokes vesting schedule
     * @param _beneficiary Beneficiary address
     */
    function revoke(address _beneficiary) external;

    /**
     * @dev Claims vested tokens
     */
    function claim() external;

      /*
     * @dev Gets user vesting details
     * @param _beneficiary Beneficiary address
     * @param planID Plan ID
     * @param index Vesting index
     * @return User vesting details
     */
    function userVestings(
        address _beneficiary
    )
        external
        view
        returns (
            uint64 startDate,
            uint256 vestedAmount,
            uint256 claimedAmount
        );        

    /*
     * @dev Gets user revoke status
     * @param _beneficiary Beneficiary address
     * @return status
     */
    function hasRevoked(
        address _beneficiary
    )
        external
        view
        returns (
          bool
        );        
}
