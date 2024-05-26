// SPDX-License-Identifier: GPL-3.0
pragma solidity 0.8.6;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {ILRTDistributor} from "./../tokens/erc20/lrtDistributor/ILRTDistributor.sol";
import {IAccessRestriction} from "../access/IAccessRestriction.sol";
import {ILRT} from "./../tokens/erc20/ILRT.sol";
import {ILRTVestingTeamSecond} from "./ILRTVestingTeamSecond.sol";
import "hardhat/console.sol";

contract LRTVestingTeamSecond is ILRTVestingTeamSecond, ReentrancyGuard {
    using Counters for Counters.Counter;

    uint64 public constant ONE_YEAR = 365 days;

    // LRT distributor reference
    ILRTDistributor public immutable lrtDistributor;
    // Access control reference
    IAccessRestriction public immutable accessRestriction;

    mapping(address => Vesting) public override userVestings;
    mapping(address => bool) override public hasRevoked;

    /**
     * @dev Reverts if caller is not admin
     */
    modifier onlyAdmin() {
        accessRestriction.ifAdmin(msg.sender);
        _;
    }

    modifier onlyNotRevoked(address _addr) {
        require(
            hasRevoked[_addr] == false,
            "LRTVestingTeamSecond::Your vesting is revoked"
        );
        _;
    }

    constructor(address _lrtDistributor, address _accessRestrictionAddress) {
        lrtDistributor = ILRTDistributor(_lrtDistributor);
        accessRestriction = IAccessRestriction(_accessRestrictionAddress);
    }

    function createVesting(
        address _beneficiary,
        uint256 _amount,
        uint64 _startDate
    ) external override onlyAdmin {
        require(
            _amount > 0,
            "LRTVestingTeamSecond::Amount should be greater than 0"
        );
        require(
            userVestings[_beneficiary].vestedAmount == 0 || hasRevoked[_beneficiary],
            "LRTVestingTeamSecond::Vesting already created"
        );

        Vesting storage userVesting = userVestings[_beneficiary];
        userVesting.vestedAmount = _amount;
        userVesting.startDate = _startDate;
        userVesting.claimedAmount = 0;
        hasRevoked[_beneficiary]=false;

        emit VestingCreated(_beneficiary, _startDate, _amount);
    }

    function claim() external override nonReentrant onlyNotRevoked(msg.sender) {
        Vesting storage vesting = userVestings[msg.sender];
        uint256 claimable = _calculateClaimable(vesting);

        uint256 releasedAmount = claimable > vesting.claimedAmount
            ? claimable - vesting.claimedAmount
            : 0;

        vesting.claimedAmount += releasedAmount;

        require(releasedAmount > 0, "LRTVestingTeamSecond::Not claimable yet");

        bool success = lrtDistributor.distribute(
            bytes32("Team"),
            releasedAmount,
            msg.sender
        );

        // Require success
        require(success, "LRTVestingTeamSecond::Fail transfer");

        emit Claimed(msg.sender, releasedAmount);
    }

    function revoke(
        address _beneficiary
    ) external override nonReentrant onlyAdmin onlyNotRevoked(_beneficiary) {
        Vesting storage vesting = userVestings[_beneficiary];
        uint256 claimable = _calculateClaimable(vesting);

        uint256 releasedAmount = claimable > vesting.claimedAmount
            ? claimable - vesting.claimedAmount
            : 0;

        vesting.claimedAmount += releasedAmount;

        if (releasedAmount > 0) {
            bool success = lrtDistributor.distribute(
                bytes32("Team"),
                releasedAmount,
                _beneficiary
            );

            // Require success
            require(success, "LRTVestingTeamSecond::Fail transfer");
        }

        hasRevoked[_beneficiary] = true;

        emit Revoked(_beneficiary, releasedAmount);
    }

    function _calculateClaimable(
        Vesting memory _vesting
    ) private view returns (uint256) {
        uint64 currentDate = uint64(block.timestamp);
        uint256 vestedAmount = _vesting.vestedAmount;
        uint256 elapsedTime = currentDate - _vesting.startDate;
        uint256 vestedAmountQuarter = _getPortion(2500, vestedAmount);

        if (elapsedTime >= ONE_YEAR * 3) {
            return vestedAmount;
        } else if (elapsedTime >= ONE_YEAR * 2) {
            uint256 addtionalAmount = (vestedAmountQuarter *
                (elapsedTime - (ONE_YEAR * 2))) / ONE_YEAR;
            return _getPortion(7500, vestedAmount) + addtionalAmount;
        } else if (elapsedTime >= ONE_YEAR) {
            uint256 addtionalAmount = (vestedAmountQuarter *
                (elapsedTime - ONE_YEAR)) / ONE_YEAR;
            return _getPortion(5000, vestedAmount) + addtionalAmount;
        } else if (elapsedTime >= ONE_YEAR / 2) {
            return vestedAmountQuarter;
        } else {
            return 0;
        }
    }

    function _getPortion(
        uint16 _percentage,
        uint256 _amount
    ) private pure returns (uint256) {
        return (_amount * _percentage) / 10000;
    }
}
