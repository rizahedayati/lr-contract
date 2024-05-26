const { expect, util } = require("chai");
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");

const {
  MarketplaceErrorMsg,
  PlanetStakeErrorMsg,
  AccessErrorMsg,
  LRTVestingErrorMsg,
  LRTNFTStakingErrorMsg,
  LRTStakingErrorMsg,
} = require("./messages");
const { ethers } = require("hardhat");

const Math = require("./helper/math");
const Helper = require("./helper");
const { lrtNFTStakingFixture } = require("./fixture/lrtNFTStaking.fixture");

const nativeCoinAddress = "0x0000000000000000000000000000000000000001";
const zeroAddress = "0x0000000000000000000000000000000000000000";
describe("lrtNFTStaking", function () {
  let lrtNFTStakingInstance,
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
    collection_one;

  before(async function () {
    ({
      lrtNFTStakingInstance,
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
      collection_one,
    } = await loadFixture(lrtNFTStakingFixture));
  });

  describe("test setting APR", function () {
    it("should allow setting apr", async function () {
      const duration = 1;
      const apr = 5000;
      const tx = await lrtNFTStakingInstance
        .connect(admin)
        .setAPR(duration, apr);
      await expect(tx)
        .to.emit(lrtNFTStakingInstance, "UpdatedAPR")
        .withArgs(duration, apr);
      const expectedAPR = await lrtNFTStakingInstance.APRs(duration);
      expect(expectedAPR).to.equal(apr);
    });

    it("should not setting apr if caller is not admin", async function () {
      const duration = 1;
      const apr = 5000;
      await expect(
        lrtNFTStakingInstance.connect(addr1).setAPR(duration, apr)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting apr if duration is invalid", async function () {
      const duration = 13;
      const apr = 5000;
      await expect(
        lrtNFTStakingInstance.connect(addr1).setAPR(duration, apr)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.INVALID_DURATION);
    });
  });

  describe("test setting stakeCapacity", function () {
    it("should allow setting stakeCapacity", async function () {
      const stakeCapacity = ethers.utils.parseUnits("600");

      const tx = await lrtNFTStakingInstance
        .connect(admin)
        .setStakeCapacity(stakeCapacity);
      await expect(tx)
        .to.emit(lrtNFTStakingInstance, "UpdatedStakeCapacity")
        .withArgs(stakeCapacity);
      expect(await lrtNFTStakingInstance.stakeCapacity()).to.equal(
        stakeCapacity
      );
    });

    it("should not setting stakeCapacity if caller is not admin", async function () {
      const stakeCapacity = ethers.utils.parseUnits("600");
      await expect(
        lrtNFTStakingInstance.connect(addr1).setStakeCapacity(stakeCapacity)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting stakeCapacity if stakeCapacity is invalid", async function () {
      const stakeCapacity = 0;
      await expect(
        lrtNFTStakingInstance.connect(admin).setStakeCapacity(stakeCapacity)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.INVALID_STAKE_CAPACITY);
    });
  });

  describe("test setting threshold", function () {
    it("should allow setting threshold", async function () {
      const threshold = ethers.utils.parseUnits("10");

      const tx = await lrtNFTStakingInstance
        .connect(admin)
        .setThreshold(threshold);
      await expect(tx)
        .to.emit(lrtNFTStakingInstance, "UpdatedThreshold")
        .withArgs(threshold);
      expect(await lrtNFTStakingInstance.threshold()).to.equal(threshold);
    });

    it("should not setting threshold if caller is not admin", async function () {
      const threshold = ethers.utils.parseUnits("10");
      await expect(
        lrtNFTStakingInstance.connect(addr1).setThreshold(threshold)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting threshold if threshold is invalid", async function () {
      const threshold = 0;
      await expect(
        lrtNFTStakingInstance.connect(admin).setThreshold(threshold)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.INVALID_THRESHOLD);
    });
  });

  describe("test setting durationLimit", function () {
    it("should allow setting duration limit", async function () {
      const durationLimit =
        (await time.latest()) + (await Helper.convertToSeconds("months", 5));

      const tx = await lrtNFTStakingInstance
        .connect(admin)
        .setDurationLimit(durationLimit);
      await expect(tx)
        .to.emit(lrtNFTStakingInstance, "UpdatedDurationLimit")
        .withArgs(durationLimit);
      expect(await lrtNFTStakingInstance.durationLimit()).to.equal(
        durationLimit
      );
    });

    it("should not setting  duration limit if caller is not admin", async function () {
      const durationLimit =
        (await time.latest()) + (await Helper.convertToSeconds("months", 5));
      await expect(
        lrtNFTStakingInstance.connect(addr1).setDurationLimit(durationLimit)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting duration limit if duration is invalid", async function () {
      const durationLimit = 0;
      await expect(
        lrtNFTStakingInstance.connect(admin).setDurationLimit(durationLimit)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.INVALID_DURATION_LIMIT);
    });
  });

  describe("test setting rewardCollection", function () {
    it("should allow setting rewardCollection", async function () {
      const rewardCollection = collection_one;

      const tx = await lrtNFTStakingInstance
        .connect(admin)
        .setRewardCollection(rewardCollection);

      const newRewardCollection =
        await lrtNFTStakingInstance.rewardCollection();
      await expect(tx)
        .to.emit(lrtNFTStakingInstance, "UpdatedRewardCollection")
        .withArgs(rewardCollection);
      expect(newRewardCollection).to.equal(rewardCollection);
    });

    it("should not setting rewardCollection if caller is not admin", async function () {
      const rewardCollection = collection_one;
      await expect(
        lrtNFTStakingInstance
          .connect(addr1)
          .setRewardCollection(rewardCollection)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting rewardCollection if rewardCollection is invalid", async function () {
      const rewardCollection = zeroAddress;
      await expect(
        lrtNFTStakingInstance
          .connect(admin)
          .setRewardCollection(rewardCollection)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.INVALID_COLLECTION);
    });
  });

  describe("test setting rewardToken", function () {
    // it("should not set rewardToken if tokenPrice is zero", async function () {
    //   const tokenId = 3;
    //   const tokenPrice = 0;
    //   const rewardLimit = 5;

    //   const rewardToken_before = await lrtNFTStakingInstance.rewardTokens(3);
    //   console.log(Number(rewardToken_before.tokenPrice), "tokenPrice");
    //   const totalRewardTokens = await lrtNFTStakingInstance.totalRewardTokens();
    //   console.log(Number(totalRewardTokens), "totalRewardTokens");

    //   await expect(
    //     lrtNFTStakingInstance
    //       .connect(admin)
    //       .setRewardToken(tokenId, tokenPrice, rewardLimit)
    //   ).to.be.revertedWith(LRTNFTStakingErrorMsg.INVALID_TOKEN_PRICE);
    // });

    it("should allow setting rewardToken", async function () {
      const tokenId = 0;
      const tokenPrice = ethers.utils.parseUnits("10");
      const rewardLimit = 5;
      const totalRewardTokens = await lrtNFTStakingInstance.totalRewardTokens();
      const rewardToken_before = await lrtNFTStakingInstance.rewardTokens(0);
      const tx = await lrtNFTStakingInstance
        .connect(admin)
        .setRewardToken(tokenId, tokenPrice, rewardLimit);
      await expect(tx)
        .to.emit(lrtNFTStakingInstance, "UpdatedRewardToken")
        .withArgs(collection_one, tokenId, tokenPrice, rewardLimit);
      const rewardToken_after = await lrtNFTStakingInstance.rewardTokens(0);
      expect(await lrtNFTStakingInstance.totalRewardTokens()).to.equal(
        totalRewardTokens
      );

      expect(rewardToken_after.tokensDistributed).to.equal(
        rewardToken_before.tokensDistributed
      );
      expect(rewardToken_after.rewardLimit).to.equal(rewardLimit);
    });

    it("should not setting rewardToken if caller is not admin", async function () {
      const tokenId = 0;
      const tokenPrice = ethers.utils.parseUnits("10");
      const rewardLimit = 5;

      await expect(
        lrtNFTStakingInstance
          .connect(addr1)
          .setRewardToken(tokenId, tokenPrice, rewardLimit)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting rewardToken if rewardLimit is invalid", async function () {
      const duration1 = 3;
      const apr1 = 5000;
      await lrtNFTStakingInstance.connect(admin).setAPR(duration1, apr1);

      const amount = ethers.utils.parseUnits("16");
      const duration = 3;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("100"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtNFTStakingInstance.address, ethers.utils.parseUnits("100"));

      const tokenId_1 = 0;
      const tokenPrice_1 = ethers.utils.parseUnits("2");
      const rewardLimit_1 = 2;

      const tx = await lrtNFTStakingInstance
        .connect(admin)
        .setRewardToken(tokenId_1, tokenPrice_1, rewardLimit_1);

      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);

      const tx1 = await lrtNFTStakingInstance
        .connect(addr2)
        .stake(amount, duration);

      const tx2 = await lrtNFTStakingInstance
        .connect(addr2)
        .stake(amount, duration);

      const rewardToken_0 = await lrtNFTStakingInstance.rewardTokens(0);
      // const rewardToken_1 = await lrtNFTStakingInstance.rewardTokens(1);
      // const rewardToken_2 = await lrtNFTStakingInstance.rewardTokens(2);
      // console.log(Number(rewardToken_0.tokenPrice), "rewardToken_0");
      // console.log(Number(rewardToken_0.tokensDistributed), "rewardToken_0");
      // console.log(Number(rewardToken_0.rewardLimit), "rewardToken_0");
      // console.log(Number(rewardToken_1.tokenPrice), "rewardToken_1");
      // console.log(Number(rewardToken_1.tokensDistributed), "rewardToken_1");
      // console.log(Number(rewardToken_1.rewardLimit), "rewardToken_1");
      // console.log(Number(rewardToken_2.tokenPrice), "rewardToken_2");
      // console.log(Number(rewardToken_2.tokensDistributed), "rewardToken_2");
      // console.log(Number(rewardToken_2.rewardLimit), "rewardToken_2");
      // console.log(
      //   Number(rewardToken.tokensDistributed),
      //   "rewardTokentokensDistributed"
      // );

      const tokenId_2 = 0;
      const tokenPrice_2 = ethers.utils.parseUnits("2.5");
      const rewardLimit_2 = 1;

      const userStake0 = await lrtNFTStakingInstance.userStakes(
        //tokenId = 0
        addr2.address,
        0
      );

      const userStake1 = await lrtNFTStakingInstance.userStakes(
        //tokenId = 0
        addr2.address,
        1
      );

      expect(rewardToken_0.tokensDistributed).to.equal(2);
      await expect(
        lrtNFTStakingInstance
          .connect(admin)
          .setRewardToken(tokenId_2, tokenPrice_2, rewardLimit_2)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.INVALID_REWARD_LIMIT);
    });
  });

  describe("test stake", function () {
    beforeEach(async function () {
      const duration1 = 3;
      const apr1 = 5000;
      const tx = await lrtNFTStakingInstance
        .connect(admin)
        .setAPR(duration1, apr1);

      const duration2 = 6;
      const apr2 = 8000;
      await lrtNFTStakingInstance.connect(admin).setAPR(duration2, apr2);
    });

    it("should allow staking LRT tokens", async function () {
      const amount = ethers.utils.parseUnits("56");
      const duration = 3;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("70"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtNFTStakingInstance.address, ethers.utils.parseUnits("70"));

      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);

      const addr2_balance = Number(
        Math.Big(await lrtInstance.balanceOf(addr2.address))
      );
      const contract_balance = Number(
        Math.Big(await lrtInstance.balanceOf(lrtNFTStakingInstance.address))
      );
      const tvl_before = await lrtNFTStakingInstance.tvl();

      const userStat_before = await lrtNFTStakingInstance.userStat(
        addr2.address
      );
      const tx = await lrtNFTStakingInstance
        .connect(addr2)
        .stake(amount, duration);

      const userStake = await lrtNFTStakingInstance.userStakes(
        //tokenId = 0
        addr2.address,
        2
      );

      const rewardToken = await lrtNFTStakingInstance.rewardTokens(1);

      const userStat_after = await lrtNFTStakingInstance.userStat(
        addr2.address
      );

      expect(
        Number(await lrtInstance.balanceOf(lrtNFTStakingInstance.address))
      ).to.equal(Number(Math.Big(contract_balance).add(Number(amount))));

      expect(Number(await lrtInstance.balanceOf(addr2.address))).to.equal(
        Number(Math.Big(addr2_balance).sub(Number(amount)))
      );

      const tvl_after = await lrtNFTStakingInstance.tvl();

      expect(userStake.duration).to.equal(duration);
      expect(userStake.tokenId).to.equal(1);
      expect(userStake.stakedAmount).to.equal(amount);
      expect(Number(tvl_after)).to.equal(
        Number(Math.Big(tvl_before).add(Number(amount)))
      );

      expect(rewardToken.tokensDistributed).to.equal(1);
      expect(userStat_after).to.equal(userStat_before + 1);

      expect(
        await clone1
          .connect(approvedContract)
          .callStatic.balanceOf(addr2.address, userStake.tokenId)
      ).to.equal(1);

      await expect(tx)
        .to.emit(lrtNFTStakingInstance, "LRTNFTStaked")
        .withArgs(
          addr2.address,
          amount,
          duration,
          collection_one,
          userStake.tokenId,
          2,
          5000
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
        .approve(lrtNFTStakingInstance.address, ethers.utils.parseUnits("40"));

      await expect(
        lrtNFTStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.INVALID_DURATION);
    });

    it("should not allow staking when amount is less than threshold", async function () {
      const amount = ethers.utils.parseUnits("2");
      const duration = 3;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("50"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtNFTStakingInstance.address, ethers.utils.parseUnits("40"));

      await expect(
        lrtNFTStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.INVALID_AMOUNT);
    });

    it("should not allow staking when duration limit is not passed", async function () {
      // await lrtNFTStakingInstance
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
        .approve(lrtNFTStakingInstance.address, ethers.utils.parseUnits("40"));

      await expect(
        lrtNFTStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.EXCEED_DURATION_LIMIT);
    });

    it("should not allow staking when amount plus current TVL is more than stake capacity", async function () {
      const amount = ethers.utils.parseUnits("600");
      const duration = 3;
      await lrtNFTStakingInstance
        .connect(admin)
        .setDurationLimit(
          (await time.latest()) + (await Helper.convertToSeconds("months", 5))
        );
      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("600"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtNFTStakingInstance.address, ethers.utils.parseUnits("600"));

      await expect(
        lrtNFTStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.EXCEED_CAPACITY);
    });

    it("should not allow staking when contract has not allowance", async function () {
      await lrtNFTStakingInstance
        .connect(admin)
        .setDurationLimit(
          (await time.latest()) + (await Helper.convertToSeconds("weeks", 1))
        );
      const amount = ethers.utils.parseUnits("80");
      const duration = 3;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("80"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtNFTStakingInstance.address, ethers.utils.parseUnits("40"));

      await expect(
        lrtNFTStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.ALLOWANCE_ERROR);
    });

    // it("should not allow staking when there is no more tokenId to reward", async function () {
    //   const amount = ethers.utils.parseUnits("16");
    //   const duration = 3;

    //   await lrtInstance
    //     .connect(distributor)
    //     .transferToken(addr2.address, ethers.utils.parseUnits("50"));

    //   await lrtInstance
    //     .connect(addr2)
    //     .approve(lrtNFTStakingInstance.address, ethers.utils.parseUnits("40"));

    //   await lrtNFTStakingInstance.connect(addr2).stake(amount, duration);

    //   const userStake = await lrtNFTStakingInstance.userStakes(
    //     addr2.address,
    //     0
    //   );

    //   await expect(
    //     lrtNFTStakingInstance.connect(addr2).stake(amount, duration)
    //   ).to.be.revertedWith(LRTNFTStakingErrorMsg.NOT_FOUND_TOKEN);

    //   const rewardToken = await lrtNFTStakingInstance.rewardTokens(0);

    //   const userStat = await lrtNFTStakingInstance.userStat(addr2.address);

    //   expect(
    //     await lrtInstance.balanceOf(lrtNFTStakingInstance.address)
    //   ).to.equal(ethers.utils.parseUnits("16"));

    //   expect(await lrtInstance.balanceOf(addr2.address)).to.equal(
    //     ethers.utils.parseUnits("34")
    //   );

    //   const tvl = await lrtNFTStakingInstance.tvl();
    //   console.log(Number(Math.Big(tvl)), "TVL");
    //   expect(Number(tvl)).to.equal(
    //     Number(Math.Big(ethers.utils.parseUnits("16")))
    //   );

    //   expect(rewardToken.tokensDistributed).to.equal(1);
    //   expect(userStat).to.equal(1);

    //   const cloneContract = await ethers.getContractFactory(
    //     "LandRockerERC1155"
    //   );
    //   const clone1 = cloneContract.attach(collection_one);
    //   expect(
    //     await clone1
    //       .connect(approvedContract)
    //       .callStatic.balanceOf(addr2.address, 0)
    //   ).to.equal(1);
    // });

    it("should not allow staking when there is no valid tokenId to reward", async function () {
      const amount = ethers.utils.parseUnits("16");
      const duration = 3;

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("200"));

      await lrtInstance
        .connect(addr2)
        .approve(lrtNFTStakingInstance.address, ethers.utils.parseUnits("16"));

      addr2_balance_before = await lrtInstance.balanceOf(addr2.address);
      const tvl_before = await lrtNFTStakingInstance.tvl();
      const userStat_before = await lrtNFTStakingInstance.userStat(
        addr2.address
      );
      const rewardToken = await lrtNFTStakingInstance.rewardTokens(0);
      const rewardToken_0 = await lrtNFTStakingInstance.rewardTokens(0);
      const rewardToken_1 = await lrtNFTStakingInstance.rewardTokens(1);
      const rewardToken_2 = await lrtNFTStakingInstance.rewardTokens(2);
     

      // await lrtNFTStakingInstance.connect(addr2).stake(amount, duration);
      await expect(
        lrtNFTStakingInstance.connect(addr2).stake(amount, duration)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.INVALID_TOKEN);
      addr2_balance_after = await lrtInstance.balanceOf(addr2.address);
      const tvl_after = await lrtNFTStakingInstance.tvl();
      const userStat_after = await lrtNFTStakingInstance.userStat(
        addr2.address
      );

      expect(addr2_balance_after).to.equal(addr2_balance_before);

      expect(tvl_before).to.equal(tvl_after);
      expect(userStat_after).to.equal(userStat_before);
    });

    it("should allow staking LRT tokens twice when token reward is unlimited", async function () {
      const amount1 = ethers.utils.parseUnits("25");
      const duration1 = 6; //apr=8000, reward amount = 10

      const amount2 = ethers.utils.parseUnits("80");
      const duration2 = 3; //apr=5000, reward amount = 10
      const rewardToken_before = await lrtNFTStakingInstance.rewardTokens(2);
      await lrtInstance
        .connect(distributor)
        .transferToken(addr1.address, ethers.utils.parseUnits("200"));

      await lrtInstance
        .connect(addr1)
        .approve(lrtNFTStakingInstance.address, ethers.utils.parseUnits("200"));

      const addr1_balance = await lrtInstance.balanceOf(addr1.address);

      const beforeBalance = await lrtInstance.balanceOf(
        lrtNFTStakingInstance.address
      );

      const tvl_before = await lrtNFTStakingInstance.tvl();
      const tx_first = await lrtNFTStakingInstance
        .connect(addr1)
        .stake(amount1, duration1);

      await expect(tx_first)
        .to.emit(lrtNFTStakingInstance, "LRTNFTStaked")
        .withArgs(
          addr1.address,
          amount1,
          duration1,
          collection_one,
          2,
          0,
          8000
        );

      const tvl_after = await lrtNFTStakingInstance.tvl();
      expect(Number(tvl_after)).to.equal(
        Number(Math.Big(tvl_before).add(amount1))
      );
      const tx_second = await lrtNFTStakingInstance
        .connect(addr1)
        .stake(amount2, duration2);

      await expect(tx_second)
        .to.emit(lrtNFTStakingInstance, "LRTNFTStaked")
        .withArgs(
          addr1.address,
          ethers.utils.parseUnits("80"),
          duration2,
          collection_one,
          2,
          1,
          5000
        );

      const tvl_second = await lrtNFTStakingInstance.tvl();
      expect(Number(tvl_second)).to.equal(
        Number(Math.Big(tvl_after).add(amount2))
      );
      const userStake1 = await lrtNFTStakingInstance.userStakes(
        addr1.address,
        0
      );
      const userStake2 = await lrtNFTStakingInstance.userStakes(
        addr1.address,
        1
      );

      const rewardToken_after = await lrtNFTStakingInstance.rewardTokens(2);

      const userStat = await lrtNFTStakingInstance.userStat(addr1.address);

      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);
      expect(
        await clone1
          .connect(approvedContract)
          .callStatic.balanceOf(addr1.address, 2)
      ).to.equal(2);

      expect(
        Number(await lrtInstance.balanceOf(lrtNFTStakingInstance.address))
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

      expect(rewardToken_after.tokensDistributed).to.equal(
        rewardToken_before.tokensDistributed.add(2)
      );
      expect(userStat).to.equal(2);
    });
  });

  describe("test unstake", function () {
    beforeEach(async function () {
      await lrtNFTStakingInstance
        .connect(admin)
        .setDurationLimit(
          (await time.latest()) + (await Helper.convertToSeconds("months", 15))
        );

      const duration1 = 12;
      const apr1 = 7000; //tokenId = 1 , rewardamount = 7
      await lrtNFTStakingInstance.connect(admin).setAPR(duration1, apr1);

      const duration2 = 6;
      const apr2 = 2000; //tokenId = 2 , rewardamount = 10
      await lrtNFTStakingInstance.connect(admin).setAPR(duration2, apr2);

      const amount1 = ethers.utils.parseUnits("10");

      const amount2 = ethers.utils.parseUnits("100");

      await lrtInstance
        .connect(distributor)
        .transferToken(addr3.address, ethers.utils.parseUnits("130"));

      await lrtInstance
        .connect(addr3)
        .approve(lrtNFTStakingInstance.address, ethers.utils.parseUnits("130"));

      await lrtNFTStakingInstance.connect(addr3).stake(amount1, duration1);
      await lrtNFTStakingInstance.connect(addr3).stake(amount2, duration2);
    });

    // it("should not allow unstake if contract has not enough balance", async function () {
    //   // Fast forward time to after the staking period has ended
    //   const elapsedTime = await Helper.convertToSeconds("months", 9);
    //   await network.provider.send("evm_increaseTime", [elapsedTime]);
    //   await network.provider.send("evm_mine");

    //   const contract_balance_before = await lrtInstance.balanceOf(
    //     lrtNFTStakingInstance.address
    //   );

    //   console.log(
    //     Number(Math.Big(contract_balance_before)),
    //     "contract_balance"
    //   );

    //   const index1 = 0;
    //   const index2 = 1;
    //   await lrtNFTStakingInstance.connect(addr1).unstake(index1);
    //   await lrtNFTStakingInstance.connect(addr1).unstake(index1);
    //   await lrtNFTStakingInstance.connect(addr1).unstake(index2);
    //   await expect(
    //     lrtNFTStakingInstance.connect(addr1).unstake(index1)
    //   ).to.be.revertedWith(lrtNFTStakingErrorMsg.INSUFFICIENT_CONTRACT_BALANCE);
    // });

    it("should not allow unstake before staking duration date", async function () {
      const index = 1;
      await expect(
        lrtNFTStakingInstance.connect(addr3).unstake(index)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.STAKING_NOT_FINISHED);
    });

    it("should allow unstake", async function () {
      const amount1 = ethers.utils.parseUnits("10");
      const amount2 = ethers.utils.parseUnits("100");
      // Fast forward time to after the staking period has ended
      const elapsedTime = await Helper.convertToSeconds("months", 15);
      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      const index = 0;
      const userStakeBefore1 = await lrtNFTStakingInstance.userStakes(
        addr3.address,
        0
      );

      const userStakeBefore2 = await lrtNFTStakingInstance.userStakes(
        addr3.address,
        1
      );

      const userStat = await lrtNFTStakingInstance.userStat(addr3.address);

      const addr3_balance_before = await lrtInstance.balanceOf(addr3.address);
      const contract_balance_before = await lrtInstance.balanceOf(
        lrtNFTStakingInstance.address
      );

      const tvl_before = await lrtNFTStakingInstance.tvl();
      const tx = await lrtNFTStakingInstance.connect(addr3).unstake(index);

      const tvl_after = await lrtNFTStakingInstance.tvl();
      expect(Number(tvl_after)).to.equal(
        Number(Math.Big(tvl_before).sub(amount1))
      );

      const addr3_balance_after = await lrtInstance.balanceOf(addr3.address);
      const contract_balance_after = await lrtInstance.balanceOf(
        lrtNFTStakingInstance.address
      );

      const userStakeAfter1 = await lrtNFTStakingInstance.userStakes(
        addr3.address,
        0
      );
      const userStakeAfter2 = await lrtNFTStakingInstance.userStakes(
        addr3.address,
        1
      );

      await expect(tx)
        .to.emit(lrtNFTStakingInstance, "LRTNFTUnStaked")
        .withArgs(addr3.address, 0, amount1);

      expect(userStakeBefore1.stakedAmount).to.equal(amount1);
      expect(userStakeAfter1.stakedAmount).to.equal(0);

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

      const index = 2;
      await expect(
        lrtNFTStakingInstance.connect(addr1).unstake(index)
      ).to.be.revertedWith(LRTNFTStakingErrorMsg.NO_STAKING);
    });
  });

  //Upgradeability testing
  // describe("Contract Version 2 test", function () {
  //   let oldContract, upgradedContract, owner, addr1;
  //   beforeEach(async function () {
  //     [owner, addr1] = await ethers.getSigners(2);

  //     const lrtNFTStakingUpgraded = await ethers.getContractFactory(
  //       "LRTNFTStakingUpgraded"
  //     );

  //     upgradedContract = await upgrades.upgradeProxy(
  //       lrtNFTStakingInstance,
  //       lrtNFTStakingUpgraded,
  //       {
  //         call: {
  //           fn: "initializeNFTStake",
  //           args: [arInstance.address, lrtInstance.address, "hi I'm upgraded"],
  //         },
  //       }
  //     );
  //   });

  //   it("New Contract Should return the old & new greeting and token name after deployment", async function () {
  //     expect(await upgradedContract.greeting()).to.equal("hi I'm upgraded");
  //   });
  // });
});
