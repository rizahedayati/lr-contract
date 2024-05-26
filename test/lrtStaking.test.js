const { expect } = require("chai");
const { ethers } = require("hardhat");
const Math = require("./helper/math");
const Helper = require("./helper");

const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");

const { lrtStakingFixture } = require("./fixture/lrtStaking.fixture");

const {
  MarketplaceErrorMsg,
  AccessErrorMsg,
  LRTStakingErrorMsg,
} = require("./messages");

describe("lrtStaking", function () {
  let lrtStakingInstance,
    lrtInstance,
    arInstance,
    admin,
    distributor,
    addr1,
    addr2,
    addr3,
    treasury;

  before(async function () {
    ({
      lrtStakingInstance,
      lrtInstance,
      arInstance,
      admin,
      distributor,
      addr1,
      addr2,
      addr3,
      treasury,
    } = await loadFixture(lrtStakingFixture));
  });

  describe("test setting APR", function () {
    it("should allow setting apr", async function () {
      const duration = 1;
      const apr = 5000;
      const tx = await lrtStakingInstance.connect(admin).setAPR(duration, apr);
      await expect(tx)
        .to.emit(lrtStakingInstance, "UpdatedAPR")
        .withArgs(duration, apr);
      const expectedAPR = await lrtStakingInstance.APRs(duration);
      expect(expectedAPR).to.equal(apr);
    });

    it("should not setting apr if caller is not admin", async function () {
      const duration = 1;
      const apr = 5000;
      await expect(
        lrtStakingInstance.connect(addr1).setAPR(duration, apr)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting apr if duration is invalid", async function () {
      const duration = 13;
      const apr = 5000;
      await expect(
        lrtStakingInstance.connect(addr1).setAPR(duration, apr)
      ).to.be.revertedWith(LRTStakingErrorMsg.INVALID_DURATION);
    });
  });

  describe("test setting stakeCapacity", function () {
    it("should allow setting stakeCapacity", async function () {
      const stakeCapacity = ethers.utils.parseUnits("600");

      const tx = await lrtStakingInstance
        .connect(admin)
        .setStakeCapacity(stakeCapacity);
      await expect(tx)
        .to.emit(lrtStakingInstance, "UpdatedStakeCapacity")
        .withArgs(stakeCapacity);

      expect(await lrtStakingInstance.stakeCapacity()).to.equal(stakeCapacity);
    });

    it("should not setting stakeCapacity if caller is not admin", async function () {
      const stakeCapacity = ethers.utils.parseUnits("600");
      await expect(
        lrtStakingInstance.connect(addr1).setStakeCapacity(stakeCapacity)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting stakeCapacity if stakeCapacity is invalid", async function () {
      const stakeCapacity = 0;
      await expect(
        lrtStakingInstance.connect(admin).setStakeCapacity(stakeCapacity)
      ).to.be.revertedWith(LRTStakingErrorMsg.INVALID_STAKE_CAPACITY);
    });
  });

  describe("test setting threshold", function () {
    it("should allow setting threshold", async function () {
      const threshold = ethers.utils.parseUnits("10");

      const tx = await lrtStakingInstance
        .connect(admin)
        .setThreshold(threshold);
      await expect(tx)
        .to.emit(lrtStakingInstance, "UpdatedThreshold")
        .withArgs(threshold);
      expect(await lrtStakingInstance.threshold()).to.equal(threshold);
    });

    it("should not setting threshold if caller is not admin", async function () {
      const threshold = ethers.utils.parseUnits("10");
      await expect(
        lrtStakingInstance.connect(addr1).setThreshold(threshold)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting threshold if threshold is invalid", async function () {
      const threshold = 0;
      await expect(
        lrtStakingInstance.connect(admin).setThreshold(threshold)
      ).to.be.revertedWith(LRTStakingErrorMsg.INVALID_THRESHOLD);
    });
  });

  describe("test setting durationLimit", function () {
    it("should allow setting duration limit", async function () {
      const durationLimit =
        (await time.latest()) + (await Helper.convertToSeconds("months", 5));

      const tx = await lrtStakingInstance
        .connect(admin)
        .setDurationLimit(durationLimit);
      await expect(tx)
        .to.emit(lrtStakingInstance, "UpdatedDurationLimit")
        .withArgs(durationLimit);
      expect(await lrtStakingInstance.durationLimit()).to.equal(durationLimit);
    });

    it("should not setting  duration limit if caller is not admin", async function () {
      const durationLimit =
        (await time.latest()) + (await Helper.convertToSeconds("months", 5));
      await expect(
        lrtStakingInstance.connect(addr1).setDurationLimit(durationLimit)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting duration limit if duration is invalid", async function () {
      const durationLimit = 0;
      await expect(
        lrtStakingInstance.connect(admin).setDurationLimit(durationLimit)
      ).to.be.revertedWith(LRTStakingErrorMsg.INVALID_DURATION_LIMIT);
    });
  });

  describe("test stake", function () {
    beforeEach(async function () {
      const duration1 = 3;
      const apr1 = 5000;
      const tx = await lrtStakingInstance
        .connect(admin)
        .setAPR(duration1, apr1);

      const duration2 = 9;
      const apr2 = 7000;
      await lrtStakingInstance.connect(admin).setAPR(duration2, apr2);
    });

    it("should allow staking LRT tokens", async function () {
      const amount = ethers.utils.parseUnits("20");
      const duration = 3;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("50"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtStakingInstance.address, ethers.utils.parseUnits("40"));

      const add2_balance = await lrtInstance.balanceOf(addr2.address);
      const tvl_before = await lrtStakingInstance.tvl();
      const tx = await lrtStakingInstance
        .connect(addr2)
        .stake(amount, duration);

      const userStake = await lrtStakingInstance.userStakes(addr2.address, 0);

      const userStat = await lrtStakingInstance.userStat(addr2.address);

      expect(await lrtInstance.balanceOf(lrtStakingInstance.address)).to.equal(
        amount
      );

      expect(
        Number(Math.Big(await lrtInstance.balanceOf(addr2.address)))
      ).to.equal(Number(Math.Big(add2_balance).sub(amount)));

      expect(userStake.duration).to.equal(duration);
      expect(userStake.apr).to.equal(5000);
      expect(userStake.stakedAmount).to.equal(amount);
      expect(userStake.claimedAmount).to.equal(0);
      // expect(userStake.rewardAmount).to.equal(ethers.utils.parseUnits("2.5"));

      expect(userStat).to.equal(1);

      const tvl_after = await lrtStakingInstance.tvl();
      expect(Number(tvl_after)).to.equal(
        Number(Math.Big(tvl_before).add(Number(Math.Big(amount))))
      );

      await expect(tx)
        .to.emit(lrtStakingInstance, "LRTStaked")
        .withArgs(
          addr2.address,
          amount,
          duration,
          0,
          userStake.rewardAmount,
          userStake.apr
        );
    });

    it("should not allow staking when duration is not valid", async function () {
      const amount = ethers.utils.parseUnits("20");
      const duration = 7;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("50"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtStakingInstance.address, ethers.utils.parseUnits("40"));

      await expect(
        lrtStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTStakingErrorMsg.INVALID_DURATION);
    });

    it("should not allow staking when amount is less than threshold", async function () {
      const amount = ethers.utils.parseUnits("2");
      const duration = 3;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("50"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtStakingInstance.address, ethers.utils.parseUnits("40"));

      await expect(
        lrtStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTStakingErrorMsg.INVALID_AMOUNT);
    });

    it("should not allow staking when duration limit is not passed", async function () {
      // await lrtStakingInstance
      //   .connect(admin)
      //   .setDurationLimit(
      //     (await time.latest()) - (await Helper.convertToSeconds("weeks", 1))
      //   );

      // Fast forward time to after the staking period has ended
      const elapsedTime = await Helper.convertToSeconds("months", 17);
      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      const amount = ethers.utils.parseUnits("20");
      const duration = 3;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("50"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtStakingInstance.address, ethers.utils.parseUnits("40"));

      await expect(
        lrtStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTStakingErrorMsg.EXCEED_DURATION_LIMIT);
    });

    it("should not allow staking when amount plus current TVL is more than stake capacity", async function () {
      const amount = ethers.utils.parseUnits("600");
      const duration = 3;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("600"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtStakingInstance.address, ethers.utils.parseUnits("600"));

      await expect(
        lrtStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTStakingErrorMsg.EXCEED_CAPACITY);
    });

    it("should not allow staking when contract has not allowance", async function () {
      await lrtStakingInstance
        .connect(admin)
        .setDurationLimit(
          (await time.latest()) + (await Helper.convertToSeconds("weeks", 1))
        );
      const amount = ethers.utils.parseUnits("20");
      const duration = 3;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("50"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtStakingInstance.address, ethers.utils.parseUnits("10"));

      await expect(
        lrtStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTStakingErrorMsg.ALLOWANCE_ERROR);
    });

    it("should allow staking LRT tokens twice", async function () {
      const amount1 = ethers.utils.parseUnits("20");
      const duration1 = 3;

      const amount2 = ethers.utils.parseUnits("15");
      const duration2 = 9;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr1.address, ethers.utils.parseUnits("60"));

      await lrtInstance
        .connect(addr1)
        .approve(lrtStakingInstance.address, ethers.utils.parseUnits("50"));

      const addr1_balance = await lrtInstance.balanceOf(addr1.address);

      const beforeBalance = await lrtInstance.balanceOf(
        lrtStakingInstance.address
      );

      await lrtStakingInstance.connect(addr1).stake(amount1, duration1);
      await lrtStakingInstance.connect(addr1).stake(amount2, duration2);
      const userStake1 = await lrtStakingInstance.userStakes(addr1.address, 0);
      const userStake2 = await lrtStakingInstance.userStakes(addr1.address, 1);

      const userStat = await lrtStakingInstance.userStat(addr1.address);

      expect(
        Number(await lrtInstance.balanceOf(lrtStakingInstance.address))
      ).to.equal(
        Number(
          Math.Big(beforeBalance).add(Number(Math.Big(amount1).add(amount2)))
        )
      );

      expect(Number(await lrtInstance.balanceOf(addr1.address))).to.equal(
        Number(
          Math.Big(addr1_balance).sub(Number(Math.Big(amount1).add(amount2)))
        )
      );

      // first staking
      expect(userStake1.duration).to.equal(duration1);
      expect(userStake1.apr).to.equal(5000);
      expect(userStake1.stakedAmount).to.equal(amount1);
      expect(userStake1.claimedAmount).to.equal(0);

      // second staking
      expect(userStake2.duration).to.equal(duration2);
      expect(userStake2.apr).to.equal(7000);
      expect(userStake2.stakedAmount).to.equal(amount2);
      expect(userStake2.claimedAmount).to.equal(0);

      expect(userStat).to.equal(2);
    });
  });

  describe("test unStake", function () {
    beforeEach(async function () {
      await lrtStakingInstance
        .connect(admin)
        .setDurationLimit(
          (await time.latest()) + (await Helper.convertToSeconds("months", 15))
        );

      const duration1 = 3;
      const apr1 = 5000;
      await lrtStakingInstance.connect(admin).setAPR(duration1, apr1);

      const duration2 = 9;
      const apr2 = 7000;
      await lrtStakingInstance.connect(admin).setAPR(duration2, apr2);

      const amount1 = ethers.utils.parseUnits("20");

      const amount2 = ethers.utils.parseUnits("15");

      await lrtInstance
        .connect(distributor)
        .transferToken(addr1.address, ethers.utils.parseUnits("60"));

      await lrtInstance
        .connect(addr1)
        .approve(lrtStakingInstance.address, ethers.utils.parseUnits("50"));

      await lrtStakingInstance.connect(addr1).stake(amount1, duration1);
      await lrtStakingInstance.connect(addr1).stake(amount2, duration2);
    });

    // it("should not allow unstake if contract has not enough balance", async function () {
    //   // Fast forward time to after the staking period has ended
    //   const elapsedTime = await Helper.convertToSeconds("months", 9);
    //   await network.provider.send("evm_increaseTime", [elapsedTime]);
    //   await network.provider.send("evm_mine");

    //   const contract_balance_before = await lrtInstance.balanceOf(
    //     lrtStakingInstance.address
    //   );

    //   console.log(
    //     Number(Math.Big(contract_balance_before)),
    //     "contract_balance"
    //   );

    //   const index1 = 0;
    //   const index2 = 1;
    //   await lrtStakingInstance.connect(addr1).unstake(index1);
    //   await lrtStakingInstance.connect(addr1).unstake(index1);
    //   await lrtStakingInstance.connect(addr1).unstake(index2);
    //   await expect(
    //     lrtStakingInstance.connect(addr1).unstake(index1)
    //   ).to.be.revertedWith(LRTStakingErrorMsg.INSUFFICIENT_CONTRACT_BALANCE);
    // });

    it("should not allow unstake before staking duration date", async function () {
      const index = 0;
      await expect(
        lrtStakingInstance.connect(addr1).unstake(index)
      ).to.be.revertedWith(LRTStakingErrorMsg.STAKING_NOT_FINISHED);
    });

    it("should allow unstake", async function () {
      const amount1 = ethers.utils.parseUnits("20");
      const amount2 = ethers.utils.parseUnits("15");

      // Fast forward time to after the staking period has ended
      const elapsedTime = await Helper.convertToSeconds("months", 4);
      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      const index = 0;
      const userStakeBefore1 = await lrtStakingInstance.userStakes(
        addr1.address,
        0
      );
      const userStakeBefore2 = await lrtStakingInstance.userStakes(
        addr1.address,
        1
      );

      const userStat = await lrtStakingInstance.userStat(addr1.address);

      const addr1_balance_before = await lrtInstance.balanceOf(addr1.address);
      const contract_balance_before = await lrtInstance.balanceOf(
        lrtStakingInstance.address
      );
      const tvl_before = await lrtStakingInstance.tvl();
      const tx = await lrtStakingInstance.connect(addr1).unstake(index);

      const addr1_balance_after = await lrtInstance.balanceOf(addr1.address);
      const contract_balance_after = await lrtInstance.balanceOf(
        lrtStakingInstance.address
      );

      const userStakeAfter1 = await lrtStakingInstance.userStakes(
        addr1.address,
        0
      );
      const userStakeAfter2 = await lrtStakingInstance.userStakes(
        addr1.address,
        1
      );

      const tvl_after = await lrtStakingInstance.tvl();
      expect(Number(tvl_after)).to.equal(
        Number(Math.Big(tvl_before).sub(Number(Math.Big(amount1))))
      );

      await expect(tx)
        .to.emit(lrtStakingInstance, "LRTUnStaked")
        .withArgs(addr1.address, 0, amount1);

      expect(userStakeBefore1.stakedAmount).to.equal(amount1);
      expect(userStakeBefore1.claimedAmount).to.equal(0);

      expect(userStakeAfter1.stakedAmount).to.equal(0);
      expect(userStakeAfter1.claimedAmount).to.equal(0);

      expect(userStakeBefore2.stakedAmount).to.equal(amount2);
      expect(userStakeBefore2.claimedAmount).to.equal(0);

      expect(userStakeAfter2.stakedAmount).to.equal(amount2);
      expect(userStakeAfter2.claimedAmount).to.equal(0);

      expect(Number(Math.Big(contract_balance_after))).to.equal(
        Number(Math.Big(contract_balance_before).sub(amount1))
      );

      expect(Number(Math.Big(addr1_balance_after))).to.equal(
        Number(Math.Big(addr1_balance_before).add(amount1))
      );
    });

    it("should not allow unstake when staked amount is zero", async function () {
      // Fast forward time to after the staking period has ended
      const elapsedTime = await Helper.convertToSeconds("months", 5);
      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      const index = 1;
      const tx = await lrtStakingInstance.connect(addr1).unstake(index);
      await expect(
        lrtStakingInstance.connect(addr1).unstake(index)
      ).to.be.revertedWith(LRTStakingErrorMsg.NO_STAKING);
    });
  });

  describe("test claim", function () {
    beforeEach(async function () {
      await lrtStakingInstance
        .connect(admin)
        .setDurationLimit(
          (await time.latest()) + (await Helper.convertToSeconds("months", 15))
        );

      const duration1 = 3;
      const apr1 = 5000;
      await lrtStakingInstance.connect(admin).setAPR(duration1, apr1);

      const duration2 = 6;
      const apr2 = 5000;
      await lrtStakingInstance.connect(admin).setAPR(duration2, apr2);

      const duration3 = 9;
      const apr3 = 7000;
      await lrtStakingInstance.connect(admin).setAPR(duration3, apr3);
      await lrtInstance
        .connect(distributor)
        .transferToken(addr3.address, ethers.utils.parseUnits("100"));

      await lrtInstance
        .connect(addr3)
        .approve(lrtStakingInstance.address, ethers.utils.parseUnits("100"));
    });

    it("should allow fully claim", async function () {
      const amount1 = ethers.utils.parseUnits("20");
      const duration1 = 3;
      await lrtStakingInstance.connect(addr3).stake(amount1, duration1);

      // Fast forward time to after the staking period has ended
      const elapsedTime = await Helper.convertToSeconds("months", 5);
      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");
      const index = 0;
      const userStakeBefore = await lrtStakingInstance.userStakes(
        addr3.address,
        0
      );

      const apr = await lrtStakingInstance.APRs(3);
      const rewardAmount = (amount1 * duration1 * apr) / 120000;

      expect(userStakeBefore.claimedAmount).to.equal(0);
      expect(userStakeBefore.stakedAmount).to.equal(amount1);

      expect(Number(userStakeBefore.rewardAmount)).to.equal(
        Number(rewardAmount)
        //ethers.utils.parseUnits("2.5")
      );

      const addr3_balance_before = await lrtInstance.balanceOf(addr3.address);
      const treasury_balance_before = await lrtInstance.balanceOf(
        treasury.address
      );

      const tx = await lrtStakingInstance.connect(addr3).claim(index);

      const addr3_balance_after = await lrtInstance.balanceOf(addr3.address);
      const treasury_balance_after = await lrtInstance.balanceOf(
        treasury.address
      );

      const userStakeAfter = await lrtStakingInstance.userStakes(
        addr3.address,
        0
      );

      expect(Number(userStakeAfter.claimedAmount)).to.equal(
        Number(rewardAmount)
      );

      expect(Number(Math.Big(treasury_balance_after))).to.equal(
        Number(Math.Big(treasury_balance_before).sub(Number(rewardAmount)))
      );

      expect(Number(Math.Big(addr3_balance_after))).to.equal(
        Number(Math.Big(addr3_balance_before).add(Number(rewardAmount)))
      );
    });

    it("should allow claim after 2 months", async function () {
      // Fast forward time to after the staking period has ended

      const amount2 = ethers.utils.parseUnits("60");
      const duration2 = 6;
      await lrtStakingInstance.connect(addr3).stake(amount2, duration2);

      const elapsedTime = await Helper.convertToSeconds("months", 2);
      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      const index = 1;
      const userStakeBefore = await lrtStakingInstance.userStakes(
        addr3.address,
        1
      );

      const apr = await lrtStakingInstance.APRs(6);
      const rewardAmount = (amount2 * duration2 * apr) / 120000;
      const availableRewardAmount = (rewardAmount * 2) / duration2;
      const currentRewardAmount =
        availableRewardAmount - userStakeBefore.claimedAmount;

      expect(userStakeBefore.claimedAmount).to.equal(0);
      expect(userStakeBefore.apr).to.equal(apr);

      expect(userStakeBefore.duration).to.equal(duration2);
      expect(Number(userStakeBefore.rewardAmount)).to.equal(
        Number(rewardAmount)
      );

      const addr3_balance_before = await lrtInstance.balanceOf(addr3.address);
      const treasury_balance_before = await lrtInstance.balanceOf(
        treasury.address
      );

      const tx = await lrtStakingInstance.connect(addr3).claim(index);

      const addr3_balance_after = await lrtInstance.balanceOf(addr3.address);
      const treasury_balance_after = await lrtInstance.balanceOf(
        treasury.address
      );

      const userStakeAfter = await lrtStakingInstance.userStakes(
        addr3.address,
        1
      );

      expect(Number(userStakeAfter.claimedAmount)).to.equal(
        Number(currentRewardAmount)
      );

      expect(Number(Math.Big(treasury_balance_after))).to.equal(
        Number(
          Math.Big(treasury_balance_before).sub(Number(currentRewardAmount))
        )
      );

      expect(Number(Math.Big(addr3_balance_after))).to.equal(
        Number(Math.Big(addr3_balance_before).add(Number(currentRewardAmount)))
      );
    });

    it("should not allow claim when claimed amount is more than reward amount", async function () {
      // Fast forward time to after the staking period has ended
      const elapsedTime = await Helper.convertToSeconds("months", 5);
      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");
      const index = 0;
      const tx = await lrtStakingInstance.connect(addr1).claim(index);
      await expect(
        lrtStakingInstance.connect(addr1).claim(index)
      ).to.be.revertedWith(LRTStakingErrorMsg.FULLY_CLAIMED);
    });

    it("should allow claim twice: after two then after three months", async function () {
      const amount3 = ethers.utils.parseUnits("15");
      const duration3 = 9;
      await lrtStakingInstance.connect(addr3).stake(amount3, duration3);

      // Fast forward time to after the staking period has ended
      const elapsedTime = await Helper.convertToSeconds("months", 2);
      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");
      const index = 2;
      const userStakeBefore1 = await lrtStakingInstance.userStakes(
        addr3.address,
        0
      );
      const userStakeBefore2 = await lrtStakingInstance.userStakes(
        addr3.address,
        1
      );
      const userStakeBefore3 = await lrtStakingInstance.userStakes(
        addr3.address,
        2
      );

      expect(userStakeBefore3.claimedAmount).to.equal(0);
      expect(userStakeBefore3.apr).to.equal(7000);
      expect(userStakeBefore3.duration).to.equal(duration3);

      const apr = await lrtStakingInstance.APRs(9);
      const rewardAmount = (amount3 * duration3 * apr) / 120000;

      expect(Number(userStakeBefore3.rewardAmount)).to.equal(
        Number(rewardAmount)
        // ethers.utils.parseUnits("7.875")
      );

      const addr3_balance_before_first_claim = await lrtInstance.balanceOf(
        addr3.address
      );
      const treasury_balance_before_first_claim = await lrtInstance.balanceOf(
        treasury.address
      );

      //Claim for the first time after two months
      const tx = await lrtStakingInstance.connect(addr3).claim(index);

      const addr3_balance_after_first_claim = await lrtInstance.balanceOf(
        addr3.address
      );
      const treasury_balance_after_first_claim = await lrtInstance.balanceOf(
        treasury.address
      );

      const userStakeAfterFirstClaim = await lrtStakingInstance.userStakes(
        addr3.address,
        2
      );

      const availableRewardAmount_1 = (rewardAmount * 2) / duration3;
      const currentRewardAmount_1 =
        availableRewardAmount_1 - userStakeBefore3.claimedAmount;


      expect(Number(userStakeAfterFirstClaim.claimedAmount)).to.equal(
        Number(currentRewardAmount_1)
        // ethers.utils.parseUnits("1.75")
      );

      expect(Number(Math.Big(treasury_balance_after_first_claim))).to.equal(
        Number(
          Math.Big(treasury_balance_before_first_claim).sub(
            Number(currentRewardAmount_1)
            // ethers.utils.parseUnits("1.75")
          )
        )
      );

      expect(Number(Math.Big(addr3_balance_after_first_claim))).to.equal(
        Number(
          Math.Big(addr3_balance_before_first_claim).add(
            Number(currentRewardAmount_1)
            // ethers.utils.parseUnits("1.75")
          )
        )
      );

      //Claim for the second time after third month
      const elapsedTimeSecond = await Helper.convertToSeconds("months", 1);
      await network.provider.send("evm_increaseTime", [elapsedTimeSecond]);
      await network.provider.send("evm_mine");
      const txSecond = await lrtStakingInstance.connect(addr3).claim(index);

      const addr3_balance_after_second_claim = await lrtInstance.balanceOf(
        addr3.address
      );
      const treasury_balance_after_second_claim = await lrtInstance.balanceOf(
        treasury.address
      );

      const userStakeAfterSecondClaim = await lrtStakingInstance.userStakes(
        addr3.address,
        2
      );

      const availableRewardAmount_2 = (rewardAmount * 3) / duration3;
      const currentRewardAmount_2 =
        availableRewardAmount_2 - userStakeAfterFirstClaim.claimedAmount;

     

      expect(Number(await lrtInstance.balanceOf(addr3.address))).to.equal(
        Number(
          Math.Big(addr3_balance_before_first_claim).add(
            Number(Math.Big(currentRewardAmount_1).add(currentRewardAmount_2))
          )
        )
      );

      expect(
        Number(Math.Big(userStakeAfterSecondClaim.claimedAmount))
      ).to.equal(
        Number(
          Math.Big(userStakeAfterFirstClaim.claimedAmount).add(
            Number(currentRewardAmount_2)
            // ethers.utils.parseUnits("0.875")
          )
        )
      );

      expect(Number(Math.Big(treasury_balance_after_second_claim))).to.equal(
        Number(
          Math.Big(treasury_balance_before_first_claim).sub(
            Number(Math.Big(currentRewardAmount_1).add(currentRewardAmount_2))
          )
        )
        // ethers.utils.parseUnits("0.875")
      );

      expect(Number(Math.Big(addr3_balance_after_second_claim))).to.equal(
        Number(
          Math.Big(addr3_balance_after_first_claim).add(
            Number(currentRewardAmount_2)
            // ethers.utils.parseUnits("0.875")
          )
        )
      );
    });

    // it("should not allow unstake if contract has not enough balance", async function () {
    //   // Fast forward time to after the staking period has ended
    //   const elapsedTime = await Helper.convertToSeconds("months", 9);
    //   await network.provider.send("evm_increaseTime", [elapsedTime]);
    //   await network.provider.send("evm_mine");n

    //   const contract_balance_before = await lrtInstance.balanceOf(
    //     lrtStakingInstance.address
    //   );

    //   console.log(
    //     Number(Math.Big(contract_balance_before)),
    //     "contract_balance"
    //   );

    //   const index1 = 0;
    //   const index2 = 1;
    //   await lrtStakingInstance.connect(addr1).unstake(index1);
    //   await lrtStakingInstance.connect(addr1).unstake(index1);
    //   await lrtStakingInstance.connect(addr1).unstake(index2);
    //   await expect(
    //     lrtStakingInstance.connect(addr1).unstake(index1)
    //   ).to.be.revertedWith(LRTStakingErrorMsg.INSUFFICIENT_CONTRACT_BALANCE);
    // });
  });

  //Upgradeability testing
  describe("Contract Version 2 test", function () {
    let oldContract, upgradedContract, owner, addr1;
    beforeEach(async function () {
      [owner, addr1] = await ethers.getSigners(2);

      const LRTStakingUpgraded = await ethers.getContractFactory(
        "LRTStakingUpgraded"
      );

      upgradedContract = await upgrades.upgradeProxy(
        lrtStakingInstance,
        LRTStakingUpgraded,
        {
          call: {
            fn: "initializeLRTStake",
            args: [arInstance.address, lrtInstance.address, "hi I'm upgraded"],
          },
        }
      );
    });

    it("New Contract Should return the old & new greeting and token name after deployment", async function () {
      expect(await upgradedContract.greeting()).to.equal("hi I'm upgraded");
    });
  });
});
