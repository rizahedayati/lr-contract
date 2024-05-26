const { expect } = require("chai");
// const { time } = require("@openzeppelin/test-helpers");
const { ethers, network } = require("hardhat");

const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-network-helpers");
const Helper = require("./helper");
const Math = require("./helper/math");
const { TimeEnumes } = require("./helper/enums");
const {
  lrtVestingTeamSecondFixture,
} = require("./fixture/lrtVestingTeamSecond.fixture");
const {
  AccessErrorMsg,
  LRTVestingTeamSecondErrorMsg,
} = require("./messages/index");
const {
  days,
} = require("@nomicfoundation/hardhat-network-helpers/dist/src/helpers/time/duration");
describe("LRTٰVestingTeamSecond contract", function () {
  let lrtVestingTeamSecondInstance,
    lrtDistributorInstance,
    lrtInstance,
    arInstance,
    owner,
    admin,
    approvedContract,
    script,
    addr1,
    addr2;

  beforeEach(async function () {
    ({
      lrtVestingTeamSecondInstance,
      lrtDistributorInstance,
      lrtInstance,
      arInstance,
      owner,
      admin,
      approvedContract,
      script,
      addr1,
      addr2,
    } = await loadFixture(lrtVestingTeamSecondFixture));
  });

  describe("create vesting", function () {
    const _startDate = Helper.convertToSeconds("days", 1);
    const _amount = ethers.utils.parseEther("1000");

    it("should only allow admin to create vesting", async function () {
      await expect(
        lrtVestingTeamSecondInstance
          .connect(owner)
          .createVesting(addr1.address, 1000, 1)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should create new vesting for the beneficiary and emit the event", async function () {
      const tx = await lrtVestingTeamSecondInstance
        .connect(admin)
        .createVesting(addr1.address, 1000, 1);

      const vesting = await lrtVestingTeamSecondInstance.userVestings(
        addr1.address
      );
      expect(vesting.vestedAmount).to.equal(1000);
      expect(vesting.startDate).to.equal(1);
      expect(vesting.claimedAmount).to.equal(0);

      expect(tx)
        .to.emit(lrtVestingTeamSecondInstance, "VestingCreated")
        .withArgs(addr1.address, 1, 1000);
    });

    it("should not allow create vesting with o amount", async function () {
      await expect(
        lrtVestingTeamSecondInstance
          .connect(admin)
          .createVesting(addr1.address, 0, 1)
      ).to.be.revertedWith(LRTVestingTeamSecondErrorMsg.INVALID_AMOUNT);
    });

    it("should not allow to create vesting if already exists", async function () {
      await lrtVestingTeamSecondInstance
        .connect(admin)
        .createVesting(addr1.address, 1000, 1);
      await expect(
        lrtVestingTeamSecondInstance
          .connect(admin)
          .createVesting(addr1.address, 1000, 1)
      ).to.be.revertedWith(
        LRTVestingTeamSecondErrorMsg.INVALID_VESTING_CREATION
      );
    });
  });

  describe("claim", function () {
    it("Should not allow claiming if beneficiary is revoked", async function () {
      const beneficiary = addr1.address;
      const amount = ethers.utils.parseUnits("100");
      const startDate =
        (await time.latest()) + (await Helper.convertToSeconds("days", 1));

      await lrtVestingTeamSecondInstance
        .connect(admin)
        .createVesting(beneficiary, amount, startDate);
      const elapsedTime = await Helper.convertToSeconds("days", 300);

      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      await lrtVestingTeamSecondInstance.connect(admin).revoke(beneficiary);

      await expect(
        lrtVestingTeamSecondInstance.connect(addr1).claim()
      ).to.be.revertedWith(LRTVestingTeamSecondErrorMsg.REVOKED_BEFORE);
    });

    it("Should not allow claiming if claimable is less than zero", async function () {
      const beneficiary = addr1.address;
      const amount = ethers.utils.parseUnits("100");
      const startDate =
        (await time.latest()) + (await Helper.convertToSeconds("days", 1));

      await lrtVestingTeamSecondInstance
        .connect(admin)
        .createVesting(beneficiary, amount, startDate);
      const elapsedTime = await Helper.convertToSeconds("days", 10);

      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      await expect(
        lrtVestingTeamSecondInstance.connect(addr1).claim()
      ).to.be.revertedWith(
        LRTVestingTeamSecondErrorMsg.INVALID_CLAIMABLE_AMOUNT
      );
    });

    it("Should allow claiming 25% of the vested amount if 6 months passed", async function () {
      const beneficiary = addr1.address;
      const amount = ethers.utils.parseUnits("100");
      const startDate = await time.latest();

      await lrtVestingTeamSecondInstance
        .connect(admin)
        .createVesting(beneficiary, amount, startDate);
      const elapsedTime = await Helper.convertToSeconds("days", 200);

      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      const userVestingBeforeClaiming =
        await lrtVestingTeamSecondInstance.userVestings(beneficiary);

      const userBalanceBeforeClaiming = await lrtInstance.balanceOf(
        beneficiary
      );

      const userVestedAmountBeforeClaiming =
        userVestingBeforeClaiming.vestedAmount;

      const tx = await lrtVestingTeamSecondInstance.connect(addr1).claim();

      const userVestingAfterClaiming =
        await lrtVestingTeamSecondInstance.userVestings(beneficiary);

      const claimedAmount = userVestingAfterClaiming.claimedAmount;

      const userBalanceAfterClaiming = await lrtInstance.balanceOf(beneficiary);

      expect(userVestingAfterClaiming.claimedAmount).to.equal(claimedAmount);
      expect(userVestingAfterClaiming.vestedAmount).to.equal(
        userVestedAmountBeforeClaiming
      );

      expect(userBalanceAfterClaiming).to.equal(
        userBalanceBeforeClaiming.add(claimedAmount)
      );

      await expect(tx)
        .to.emit(lrtVestingTeamSecondInstance, "Claimed")
        .withArgs(beneficiary, claimedAmount);
    });

    it("Should allow claiming 50% of the vested amount if 1 year passed", async function () {
      const beneficiary = addr1.address;
      const amount = ethers.utils.parseUnits("100");
      const startDate = await time.latest();

      await lrtVestingTeamSecondInstance
        .connect(admin)
        .createVesting(beneficiary, amount, startDate);
      const elapsedTime = await Helper.convertToSeconds("days", 400);

      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      const userVestingBeforeClaiming =
        await lrtVestingTeamSecondInstance.userVestings(beneficiary);

      const userBalanceBeforeClaiming = await lrtInstance.balanceOf(
        beneficiary
      );

      const userVestedAmountBeforeClaiming =
        userVestingBeforeClaiming.vestedAmount;

      const tx = await lrtVestingTeamSecondInstance.connect(addr1).claim();

      const userVestingAfterClaiming =
        await lrtVestingTeamSecondInstance.userVestings(beneficiary);

      const claimedAmount = userVestingAfterClaiming.claimedAmount;

      const userBalanceAfterClaiming = await lrtInstance.balanceOf(beneficiary);

      expect(userVestingAfterClaiming.claimedAmount).to.equal(claimedAmount);
      expect(userVestingAfterClaiming.vestedAmount).to.equal(
        userVestedAmountBeforeClaiming
      );

      expect(userBalanceAfterClaiming).to.equal(
        userBalanceBeforeClaiming.add(claimedAmount)
      );

      await expect(tx)
        .to.emit(lrtVestingTeamSecondInstance, "Claimed")
        .withArgs(beneficiary, claimedAmount);
    });

    it("Should allow claiming 75% of the vested amount if 1.5 years passed", async function () {
      const beneficiary = addr1.address;
      const amount = ethers.utils.parseUnits("100");
      const startDate = await time.latest();

      await lrtVestingTeamSecondInstance
        .connect(admin)
        .createVesting(beneficiary, amount, startDate);
      const elapsedTime = await Helper.convertToSeconds("days", 600);

      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      const userVestingBeforeClaiming =
        await lrtVestingTeamSecondInstance.userVestings(beneficiary);

      const userBalanceBeforeClaiming = await lrtInstance.balanceOf(
        beneficiary
      );

      const userVestedAmountBeforeClaiming =
        userVestingBeforeClaiming.vestedAmount;

      const tx = await lrtVestingTeamSecondInstance.connect(addr1).claim();

      const userVestingAfterClaiming =
        await lrtVestingTeamSecondInstance.userVestings(beneficiary);

      const claimedAmount = userVestingAfterClaiming.claimedAmount;

      const userBalanceAfterClaiming = await lrtInstance.balanceOf(beneficiary);

      expect(userVestingAfterClaiming.claimedAmount).to.equal(claimedAmount);
      expect(userVestingAfterClaiming.vestedAmount).to.equal(
        userVestedAmountBeforeClaiming
      );

      expect(userBalanceAfterClaiming).to.equal(
        userBalanceBeforeClaiming.add(claimedAmount)
      );

      await expect(tx)
        .to.emit(lrtVestingTeamSecondInstance, "Claimed")
        .withArgs(beneficiary, claimedAmount);
    });

    it("Should allow claiming 100% of the vested amount if 2 years passed", async function () {
      const beneficiary = addr1.address;
      const amount = ethers.utils.parseUnits("100");
      const startDate = await time.latest();

      await lrtVestingTeamSecondInstance
        .connect(admin)
        .createVesting(beneficiary, amount, startDate);
      const elapsedTime = await Helper.convertToSeconds("days", 800);

      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      const userVestingBeforeClaiming =
        await lrtVestingTeamSecondInstance.userVestings(beneficiary);

      const userBalanceBeforeClaiming = await lrtInstance.balanceOf(
        beneficiary
      );

      const userVestedAmountBeforeClaiming =
        userVestingBeforeClaiming.vestedAmount;

      const tx = await lrtVestingTeamSecondInstance.connect(addr1).claim();

      const userVestingAfterClaiming =
        await lrtVestingTeamSecondInstance.userVestings(beneficiary);

      const claimedAmount = userVestingAfterClaiming.claimedAmount;

      const userBalanceAfterClaiming = await lrtInstance.balanceOf(beneficiary);

      expect(userVestingAfterClaiming.claimedAmount).to.equal(claimedAmount);

      expect(userVestingAfterClaiming.vestedAmount).to.equal(
        userVestedAmountBeforeClaiming
      );

      expect(userBalanceAfterClaiming).to.equal(
        userBalanceBeforeClaiming.add(claimedAmount)
      );

      await expect(tx)
        .to.emit(lrtVestingTeamSecondInstance, "Claimed")
        .withArgs(beneficiary, claimedAmount);
    });

    it("Should not allow  claim twoice", async function () {
      const beneficiary = addr1.address;
      const amount = ethers.utils.parseUnits("100");
      const startDate = await time.latest();

      await lrtVestingTeamSecondInstance
        .connect(admin)
        .createVesting(beneficiary, amount, startDate);
      const elapsedTime = await Helper.convertToSeconds("days", 1095);

      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      await lrtVestingTeamSecondInstance.connect(addr1).claim();

      await expect(
        lrtVestingTeamSecondInstance.connect(addr1).claim()
      ).to.be.revertedWith(
        LRTVestingTeamSecondErrorMsg.INVALID_CLAIMABLE_AMOUNT
      );
    });
  });

  describe("revoke", function () {
    it("Should not allow revoke if beneficiary already revoked ", async function () {
      const beneficiary = addr1.address;
      const amount = 100;

      const tx = await lrtVestingTeamSecondInstance
        .connect(admin)
        .createVesting(beneficiary, amount, 1);
      await lrtVestingTeamSecondInstance.connect(admin).revoke(beneficiary);

      await expect(
        lrtVestingTeamSecondInstance.connect(admin).revoke(beneficiary)
      ).to.be.revertedWith(LRTVestingTeamSecondErrorMsg.REVOKED_BEFORE);
    });

    it("Should not allow to revoke if the caller is not admin", async function () {
      const beneficiary = addr1.address;
      await expect(
        lrtVestingTeamSecondInstance.connect(addr1).revoke(beneficiary)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("Should allow revoking if claimable is less than zero", async function () {
      const beneficiary = addr1.address;
      const amount = ethers.utils.parseUnits("100");
      const startDate = await time.latest();

      await lrtVestingTeamSecondInstance
        .connect(admin)
        .createVesting(beneficiary, amount, startDate);
      const elapsedTime = await Helper.convertToSeconds("days", 10);

      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      await lrtVestingTeamSecondInstance.connect(admin).revoke(beneficiary);

      expect(
        await lrtVestingTeamSecondInstance.hasRevoked(beneficiary)
      ).to.equal(true);

      await lrtVestingTeamSecondInstance
        .connect(admin)
        .createVesting(beneficiary, amount, startDate);

      await expect(
        lrtVestingTeamSecondInstance.connect(addr1).claim()
      ).to.be.revertedWith(
        LRTVestingTeamSecondErrorMsg.INVALID_CLAIMABLE_AMOUNT
      );
    });

    it("Should allow revoking", async function () {
      const beneficiary = addr1.address;
      const amount = ethers.utils.parseUnits("100");
      const listedDate = await time.latest();

      await lrtVestingTeamSecondInstance
        .connect(admin)
        .createVesting(beneficiary, amount, listedDate);
      const elapsedTime = await Helper.convertToSeconds("days", 200);

      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      const userBalanceBeforeRevoking = await lrtInstance.balanceOf(
        beneficiary
      );

      const tx = await lrtVestingTeamSecondInstance
        .connect(admin)
        .revoke(beneficiary);

      const userBalanceAfterRevoking = await lrtInstance.balanceOf(beneficiary);

      const userVesting = await lrtVestingTeamSecondInstance.userVestings(
        beneficiary
      );

      const claimedAmount = userVesting.claimedAmount;

      expect(userBalanceAfterRevoking).to.equal(
        userBalanceBeforeRevoking.add(claimedAmount)
      );

      await expect(tx)
        .to.emit(lrtVestingTeamSecondInstance, "Revoked")
        .withArgs(beneficiary, claimedAmount);
    });
  });
});
