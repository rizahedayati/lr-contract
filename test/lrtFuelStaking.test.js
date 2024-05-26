const { expect, util } = require("chai");
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");

const {
  MarketplaceErrorMsg,
  AccessErrorMsg,
  LRTFuelStakingErrorMsg,
} = require("./messages");
const { ethers } = require("hardhat");

const Math = require("./helper/math");
const Helper = require("./helper");
const { lrtFuelStakingFixture } = require("./fixture/lrtFuelStaking.fixture");

const nativeCoinAddress = "0x0000000000000000000000000000000000000001";
const zeroAddress = "0x0000000000000000000000000000000000000000";
describe("lrtFuelStaking", function () {
  let lrtFuelStakingInstance,
    lrtInstance,
    arInstance,
    owner,
    admin,
    distributor,
    approvedContract,
    script,
    addr1,
    addr2,
    addr3,
    treasury;

  before(async function () {
    ({
      lrtFuelStakingInstance,
      lrtInstance,
      arInstance,
      owner,
      admin,
      distributor,
      approvedContract,
      script,
      addr1,
      addr2,
      addr3,
      treasury,
    } = await loadFixture(lrtFuelStakingFixture));
  });

  describe("test setting stakeCapacity", function () {
    it("should allow setting stakeCapacity", async function () {
      const stakeCapacity = ethers.utils.parseUnits("600");

      const tx = await lrtFuelStakingInstance
        .connect(admin)
        .setStakeCapacity(stakeCapacity);
      await expect(tx)
        .to.emit(lrtFuelStakingInstance, "UpdatedStakeCapacity")
        .withArgs(stakeCapacity);

      expect(await lrtFuelStakingInstance.stakeCapacity()).to.equal(
        stakeCapacity
      );
    });

    it("should not setting stakeCapacity if caller is not admin", async function () {
      const stakeCapacity = ethers.utils.parseUnits("600");
      await expect(
        lrtFuelStakingInstance.connect(addr1).setStakeCapacity(stakeCapacity)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting stakeCapacity if stakeCapacity is invalid", async function () {
      const stakeCapacity = 0;
      await expect(
        lrtFuelStakingInstance.connect(admin).setStakeCapacity(stakeCapacity)
      ).to.be.revertedWith(LRTFuelStakingErrorMsg.INVALID_STAKE_CAPACITY);
    });
  });

  describe("test setting threshold", function () {
    it("should allow setting threshold", async function () {
      const threshold = ethers.utils.parseUnits("10");

      const tx = await lrtFuelStakingInstance
        .connect(admin)
        .setThreshold(threshold);
      await expect(tx)
        .to.emit(lrtFuelStakingInstance, "UpdatedThreshold")
        .withArgs(threshold);
      expect(await lrtFuelStakingInstance.threshold()).to.equal(threshold);
    });

    it("should not setting threshold if caller is not admin", async function () {
      const threshold = ethers.utils.parseUnits("10");
      await expect(
        lrtFuelStakingInstance.connect(addr1).setThreshold(threshold)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting threshold if threshold is invalid", async function () {
      const threshold = 0;
      await expect(
        lrtFuelStakingInstance.connect(admin).setThreshold(threshold)
      ).to.be.revertedWith(LRTFuelStakingErrorMsg.INVALID_THRESHOLD);
    });
  });

  describe("test setting durationLimit", function () {
    it("should allow setting duration limit", async function () {
      const durationLimit =
        (await time.latest()) + (await Helper.convertToSeconds("months", 5));

      const tx = await lrtFuelStakingInstance
        .connect(admin)
        .setDurationLimit(durationLimit);
      await expect(tx)
        .to.emit(lrtFuelStakingInstance, "UpdatedDurationLimit")
        .withArgs(durationLimit);

      expect(await lrtFuelStakingInstance.durationLimit()).to.equal(
        durationLimit
      );
    });

    it("should not setting  duration limit if caller is not admin", async function () {
      const durationLimit =
        (await time.latest()) + (await Helper.convertToSeconds("months", 5));
      await expect(
        lrtFuelStakingInstance.connect(addr1).setDurationLimit(durationLimit)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting duration limit if duration is invalid", async function () {
      const durationLimit = 0;
      await expect(
        lrtFuelStakingInstance.connect(admin).setDurationLimit(durationLimit)
      ).to.be.revertedWith(LRTFuelStakingErrorMsg.INVALID_DURATION_LIMIT);
    });
  });

  describe("test stake", function () {
    it("should allow staking LRT tokens", async function () {
      const amount = ethers.utils.parseUnits("16");
      const duration = 3;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("50"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtFuelStakingInstance.address, ethers.utils.parseUnits("40"));

      const addr2_balance = await lrtInstance.balanceOf(addr2.address);
      const tx = await lrtFuelStakingInstance
        .connect(addr2)
        .stake(amount, duration);

      const userStake = await lrtFuelStakingInstance.userStakes(
        addr2.address,
        0
      );

      const userStat = await lrtFuelStakingInstance.userStat(addr2.address);

      expect(
        await lrtInstance.balanceOf(lrtFuelStakingInstance.address)
      ).to.equal(amount);

      expect(Number(await lrtInstance.balanceOf(addr2.address))).to.equal(
        Number(Math.Big(addr2_balance).sub(Number(amount)))
      );

      const tvl = await lrtFuelStakingInstance.tvl();
      expect(userStake.duration).to.equal(3);
      expect(userStake.stakedAmount).to.equal(amount);
      expect(Number(tvl)).to.equal(Number(Math.Big(amount)));

      expect(userStat).to.equal(1);

      await expect(tx)
        .to.emit(lrtFuelStakingInstance, "LRTFuelStaked")
        .withArgs(addr2.address, amount, duration, 0);
    });

    it("should not allow staking when duration is not valid", async function () {
      const amount = ethers.utils.parseUnits("20");
      const duration = 7;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("50"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtFuelStakingInstance.address, ethers.utils.parseUnits("40"));

      await expect(
        lrtFuelStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTFuelStakingErrorMsg.INVALID_DURATION);
    });

    it("should not allow staking when amount is less than threshold", async function () {
      const amount = ethers.utils.parseUnits("2");
      const duration = 3;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("50"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtFuelStakingInstance.address, ethers.utils.parseUnits("40"));

      await expect(
        lrtFuelStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTFuelStakingErrorMsg.INVALID_AMOUNT);
    });

    it("should not allow staking when duration limit is not passed", async function () {
      // await lrtFuelStakingInstance
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
        .approve(lrtFuelStakingInstance.address, ethers.utils.parseUnits("40"));

      await expect(
        lrtFuelStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTFuelStakingErrorMsg.EXCEED_DURATION_LIMIT);
    });

    it("should not allow staking when amount plus current TVL is more than stake capacity", async function () {
      const amount = ethers.utils.parseUnits("600");
      const duration = 3;
      await lrtFuelStakingInstance
        .connect(admin)
        .setDurationLimit(
          (await time.latest()) + (await Helper.convertToSeconds("months", 5))
        );
      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("600"));

      await lrtInstance
        .connect(addr2)
        .approve(
          lrtFuelStakingInstance.address,
          ethers.utils.parseUnits("600")
        );

      await expect(
        lrtFuelStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTFuelStakingErrorMsg.EXCEED_CAPACITY);
    });

    it("should not allow staking when contract has not allowance", async function () {
      await lrtFuelStakingInstance
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
        .approve(lrtFuelStakingInstance.address, ethers.utils.parseUnits("10"));

      await expect(
        lrtFuelStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTFuelStakingErrorMsg.ALLOWANCE_ERROR);
    });

    it("should allow staking LRT tokens twice", async function () {
      const amount1 = ethers.utils.parseUnits("25");
      const duration1 = 6;

      const amount2 = ethers.utils.parseUnits("80");
      const duration2 = 3;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr1.address, ethers.utils.parseUnits("200"));

      await lrtInstance
        .connect(addr1)
        .approve(
          lrtFuelStakingInstance.address,
          ethers.utils.parseUnits("200")
        );

      const addr1_balance = await lrtInstance.balanceOf(addr1.address);
      const beforeBalance = await lrtInstance.balanceOf(
        lrtFuelStakingInstance.address
      );

      const tvl_before = await lrtFuelStakingInstance.tvl();
      const tx_first = await lrtFuelStakingInstance
        .connect(addr1)
        .stake(amount1, duration1);

      await expect(tx_first)
        .to.emit(lrtFuelStakingInstance, "LRTFuelStaked")
        .withArgs(addr1.address, amount1, duration1, 0);

      const tvl_after = await lrtFuelStakingInstance.tvl();
      expect(Number(tvl_after)).to.equal(
        Number(Math.Big(tvl_before).add(amount1))
      );
      const tx_second = await lrtFuelStakingInstance
        .connect(addr1)
        .stake(amount2, duration2);

      await expect(tx_second)
        .to.emit(lrtFuelStakingInstance, "LRTFuelStaked")
        .withArgs(addr1.address, amount2, duration2, 1);

      const tvl_second = await lrtFuelStakingInstance.tvl();
      expect(Number(tvl_second)).to.equal(
        Number(Math.Big(tvl_after).add(amount2))
      );
      const userStake1 = await lrtFuelStakingInstance.userStakes(
        addr1.address,
        0
      );
      const userStake2 = await lrtFuelStakingInstance.userStakes(
        addr1.address,
        1
      );

      const userStat = await lrtFuelStakingInstance.userStat(addr1.address);

      expect(
        Number(await lrtInstance.balanceOf(lrtFuelStakingInstance.address))
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
      expect(userStake1.duration).to.equal(6);
      expect(userStake1.stakedAmount).to.equal(amount1);

      // second staking
      expect(userStake2.duration).to.equal(3);
      expect(userStake2.stakedAmount).to.equal(amount2);

      expect(userStat).to.equal(2);
    });
  });

  describe("test unstake", function () {
    beforeEach(async function () {
      await lrtFuelStakingInstance
        .connect(admin)
        .setDurationLimit(
          (await time.latest()) + (await Helper.convertToSeconds("months", 15))
        );

      const duration1 = 12;
      const amount1 = ethers.utils.parseUnits("10");

      const duration2 = 6;
      const amount2 = ethers.utils.parseUnits("70");

      await lrtInstance
        .connect(distributor)
        .transferToken(addr3.address, ethers.utils.parseUnits("100"));

      await lrtInstance
        .connect(addr3)
        .approve(
          lrtFuelStakingInstance.address,
          ethers.utils.parseUnits("100")
        );

      await lrtFuelStakingInstance.connect(addr3).stake(amount1, duration1);
      await lrtFuelStakingInstance.connect(addr3).stake(amount2, duration2);
    });

    // it("should not allow unstake if contract has not enough balance", async function () {
    //   // Fast forward time to after the staking period has ended
    //   const elapsedTime = await Helper.convertToSeconds("months", 9);
    //   await network.provider.send("evm_increaseTime", [elapsedTime]);
    //   await network.provider.send("evm_mine");

    //   const contract_balance_before = await lrtInstance.balanceOf(
    //     lrtFuelStakingInstance.address
    //   );

    //   console.log(
    //     Number(Math.Big(contract_balance_before)),
    //     "contract_balance"
    //   );

    //   const index1 = 0;
    //   const index2 = 1;
    //   await lrtFuelStakingInstance.connect(addr1).unstake(index1);
    //   await lrtFuelStakingInstance.connect(addr1).unstake(index1);
    //   await lrtFuelStakingInstance.connect(addr1).unstake(index2);
    //   await expect(
    //     lrtFuelStakingInstance.connect(addr1).unstake(index1)
    //   ).to.be.revertedWith(lrtFuelStakingErrorMsg.INSUFFICIENT_CONTRACT_BALANCE);
    // });

    it("should not allow unstake before staking duration date", async function () {
      const index = 0;
      await expect(
        lrtFuelStakingInstance.connect(addr1).unstake(index)
      ).to.be.revertedWith(LRTFuelStakingErrorMsg.STAKING_NOT_FINISHED);
    });

    it("should allow unstake", async function () {
      const amount1 = ethers.utils.parseUnits("10");
      const amount2 = ethers.utils.parseUnits("70");

      // Fast forward time to after the staking period has ended
      const elapsedTime = await Helper.convertToSeconds("months", 15);
      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      const index = 0;
      const userStakeBefore1 = await lrtFuelStakingInstance.userStakes(
        addr3.address,
        0
      );
      const userStakeBefore2 = await lrtFuelStakingInstance.userStakes(
        addr3.address,
        1
      );
 
      const userStat = await lrtFuelStakingInstance.userStat(addr3.address);

      const addr3_balance_before = await lrtInstance.balanceOf(addr3.address);
      const contract_balance_before = await lrtInstance.balanceOf(
        lrtFuelStakingInstance.address
      );

      const tvl_before = await lrtFuelStakingInstance.tvl();
      const tx = await lrtFuelStakingInstance.connect(addr3).unstake(index);

      const tvl_after = await lrtFuelStakingInstance.tvl();
      expect(Number(tvl_after)).to.equal(
        Number(Math.Big(tvl_before).sub(amount1))
      );

      const addr3_balance_after = await lrtInstance.balanceOf(addr3.address);
      const contract_balance_after = await lrtInstance.balanceOf(
        lrtFuelStakingInstance.address
      );

      const userStakeAfter1 = await lrtFuelStakingInstance.userStakes(
        addr3.address,
        0
      );
      const userStakeAfter2 = await lrtFuelStakingInstance.userStakes(
        addr3.address,
        1
      );
      await expect(tx)
        .to.emit(lrtFuelStakingInstance, "LRTFuelUnStaked")
        .withArgs(addr3.address, 0, amount1);

      expect(userStakeBefore1.stakedAmount).to.equal(amount1);
      expect(userStakeAfter1.stakedAmount).to.equal(
        Number(Math.Big(userStakeBefore1.stakedAmount).sub(amount1))
      );

      expect(userStakeBefore2.stakedAmount).to.equal(amount2);

      expect(userStakeAfter2.stakedAmount).to.equal(amount2);

      expect(Number(Math.Big(contract_balance_after))).to.equal(
        Number(Math.Big(contract_balance_before).sub(amount1))
      );

      expect(Number(Math.Big(addr3_balance_after))).to.equal(
        Number(Math.Big(addr3_balance_before).add(amount1))
      );

    });

    it("should not allow unstake when staked amount is zero", async function () {
      // Fast forward time to after the staking period has ended
      const elapsedTime = await Helper.convertToSeconds("months", 5);
      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      const index = 3;
      await expect(
        lrtFuelStakingInstance.connect(addr1).unstake(index)
      ).to.be.revertedWith(LRTFuelStakingErrorMsg.NO_STAKING);
    });
  });

  //Upgradeability testing
  describe("Contract Version 2 test", function () {
    let oldContract, upgradedContract, owner, addr1;
    beforeEach(async function () {
      [owner, addr1] = await ethers.getSigners(2);

      const lrtFuelStakingUpgraded = await ethers.getContractFactory(
        "LRTFuelStakingUpgraded"
      );

      upgradedContract = await upgrades.upgradeProxy(
        lrtFuelStakingInstance,
        lrtFuelStakingUpgraded,
        {
          call: {
            fn: "initializeFuelStake",
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
