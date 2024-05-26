const { expect, util } = require("chai");
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");

const {
  MarketplaceErrorMsg,
  AccessErrorMsg,
  LootBoxErrorMsg,
  LR1155Message,
} = require("./messages");
const { ethers, network } = require("hardhat");

const Math = require("./helper/math");

const { lootBoxFixture } = require("./fixture/lootBox.fixture");
const Helper = require("./helper");
const { balance } = require("@openzeppelin/test-helpers");
const address = require("ethers-utils/address");

const zeroAddress = "0x0000000000000000000000000000000000000000";

describe("LootBox contract", function () {
  let lootBoxInstance,
    lrtVestingInstance,
    landRockerInstance,
    landRockerERC1155Instance,
    lrtInstance,
    lrtDistributorInstance,
    arInstance,
    owner,
    admin,
    distributor,
    minter,
    approvedContract,
    script,
    addr1,
    addr2,
    treasury,
    royaltyRecipient,
    collection_one,
    collection_two,
    discountExpireDate;
  let baseURI =
    "https://srvs20.landrocker.io/game_service/bc/get/uniq/token/data?token_id=";
  let baseURI2 =
    "https://srvs20.landrocker.io/game_service/bc/get/token/data?token_id=";

  const cap = ethers.utils.parseUnits("100");
  const discountPercentage = 1000;

  let usecase22222 = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("LOOTBOX"));

  beforeEach(async function () {
    ({
      lootBoxInstance,
      landRockerInstance,
      landRockerERC1155Instance,
      lrtInstance,
      lrtDistributorInstance,
      arInstance,
      owner,
      admin,
      distributor,
      minter,
      approvedContract,
      script,
      addr1,
      addr2,
      treasury,
      royaltyRecipient,
      factory,
      lrtVestingInstance,
      collection_one,
      collection_two,
    } = await loadFixture(lootBoxFixture));

    discountExpireDate =
      (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
  });

  describe("test setting lootBoxCapacity", function () {
    it("should allow setting lootBoxCapacity", async function () {
      const lootBoxCapacity = ethers.utils.parseUnits("600");

      const tx = await lootBoxInstance
        .connect(admin)
        .setLootBoxCapacity(lootBoxCapacity);
      await expect(tx)
        .to.emit(lootBoxInstance, "UpdatedLootBoxCapacity")
        .withArgs(lootBoxCapacity);

      expect(await lootBoxInstance.lootBoxCapacity()).to.equal(lootBoxCapacity);
    });

    it("should not setting lootBoxCapacity if caller is not admin", async function () {
      const lootBoxCapacity = ethers.utils.parseUnits("600");
      await expect(
        lootBoxInstance.connect(addr1).setLootBoxCapacity(lootBoxCapacity)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not setting lootBoxCapacity if lootBoxCapacity is invalid", async function () {
      const lootBoxCapacity = 0;
      await expect(
        lootBoxInstance.connect(admin).setLootBoxCapacity(lootBoxCapacity)
      ).to.be.revertedWith(LootBoxErrorMsg.INVALID_LOOT_BOX_CAPACITY);
    });
  });

  describe("test withdraw", function () {
    beforeEach(async function () {
      const price = ethers.utils.parseUnits("5");
      const listedAmount = 10;
      const sellUnit = 10;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);


      await lootBoxInstance.connect(addr2).buyItem(0);
    });

    it("should allow to withdraw contract balance", async function () {
      const amount = ethers.utils.parseUnits("0.002", 18);
      const treasuryAddress = await landRockerInstance.treasury();

      const oldTreasury = await lrtInstance.balanceOf(treasuryAddress);
      const oldSystemBalance = await lrtInstance.balanceOf(
        lootBoxInstance.address
      );

      ethers.utils.formatUnits(
        await lrtInstance.balanceOf(lootBoxInstance.address)
      ),
        "after buy";

      const tx = await lootBoxInstance.connect(admin).withdraw(amount);

      await expect(tx)
        .to.emit(lootBoxInstance, "Withdrawn")
        .withArgs(amount, treasuryAddress);

      const newTreasury = await lrtInstance.balanceOf(treasuryAddress);
      const newSystemBalance = await lrtInstance.balanceOf(
        lootBoxInstance.address
      );

      expect(Number(newTreasury)).to.equal(
        Number(Math.Big(oldTreasury).add(amount))
      );
      expect(Number(newSystemBalance)).to.equal(
        Number(Math.Big(oldSystemBalance).sub(amount))
      );
    });

    it("should not allow to withdraw sell if caller is not admin", async function () {
      const amount = ethers.utils.parseUnits("0.002", 18);

      await expect(
        lootBoxInstance.connect(addr1).withdraw(amount)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not allow to withdraw sell if amount is too low", async function () {
      const amount = ethers.utils.parseUnits("0", 18);

      await expect(
        lootBoxInstance.connect(admin).withdraw(amount)
      ).to.be.revertedWith(LootBoxErrorMsg.TOO_LOW_AMOUNT);

    });

    it("should not allow to withdraw sell if balance insufficient", async function () {
      const amount = ethers.utils.parseUnits("1000", 18);

      await expect(
        lootBoxInstance.connect(admin).withdraw(amount)
      ).to.be.revertedWith(LootBoxErrorMsg.NO_BALANCE_WITHDRAW);
    });
  });

  describe("test create Sell", function () {
    beforeEach(async function () {});

    it("should allow to create sell", async function () {
      // Create an sell
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 100;
      const sellUnit = 1;

      const tx = await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      const sell = await lootBoxInstance.lootBoxSells(0);

      await expect(tx)
        .to.emit(lootBoxInstance, "SellCreated")
        .withArgs(0, price, sellUnit, listedAmount);

      // Check that the sell has the correct details
      expect(sell.price).to.equal(price);
      expect(sell.status).to.equal(0);
      expect(sell.listedAmount).to.equal(listedAmount);
      expect(sell.sellUnit).to.equal(sellUnit);
      expect(sell.soldAmount).to.equal(0);
    });

    it("should not allow to create sell if caller is not admin", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 100;
      const sellUnit = 1;

      await expect(
        lootBoxInstance.connect(addr2).createSell(price, sellUnit, listedAmount)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not allow to create sell if listed Amount is too low", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 0;
      const sellUnit = 1;

      await expect(
        lootBoxInstance.connect(admin).createSell(price, sellUnit, listedAmount)
      ).to.be.revertedWith(LootBoxErrorMsg.INVALID_LISTED_AMOUNT);
    });

    it("should not allow to create sell if sell unit is too low", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 10;
      const sellUnit = 0;

      await expect(
        lootBoxInstance.connect(admin).createSell(price, sellUnit, listedAmount)
      ).to.be.revertedWith(LootBoxErrorMsg.INVALID_SELL_UNIT);
    });

    it("should not allow to create sell if sell unit is larger than listed Amount", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 10;
      const sellUnit = 100;

      await expect(
        lootBoxInstance.connect(admin).createSell(price, sellUnit, listedAmount)
      ).to.be.revertedWith(LootBoxErrorMsg.SELL_UNIT_IS_LARGER);
    });

    it("should not allow to create sell if listed amount is not a coefficient of sell unit", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 10;
      const sellUnit = 6;

      await expect(
        lootBoxInstance.connect(admin).createSell(price, sellUnit, listedAmount)
      ).to.be.revertedWith(LootBoxErrorMsg.NOT_COEFFICIENT_OF_SELL_UNIT);
    });

    it("should not allow to create sell if price is equal or less than zero", async function () {
      const price = ethers.utils.parseUnits("0");
      const listedAmount = 10;
      const sellUnit = 1;

      await expect(
        lootBoxInstance.connect(admin).createSell(price, sellUnit, listedAmount)
      ).to.be.revertedWith(LootBoxErrorMsg.INVALID_PRICE);
    });
  });

  describe("test edit sell", function () {
    beforeEach(async function () {});

    it("should not allow to edit sell when The sell does not exist", async function () {
      //new values
      const price2 = ethers.utils.parseUnits("2");
      const listedAmount2 = 50;
      const sellUnit2 = 2;

      await expect(
        lootBoxInstance
          .connect(admin)
          .editSell(0, price2, sellUnit2, listedAmount2)
      ).to.be.revertedWith(LootBoxErrorMsg.INVALID_SELL);
    });


    it("should not allow to edit sell if caller is not admin", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 100;
      const sellUnit = 1;

      await expect(
        lootBoxInstance
          .connect(addr2)
          .editSell(0, price, sellUnit, listedAmount)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not allow to edit sell if listed Amount is too low", async function () {
      // Create an sell
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 100;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      const price2 = ethers.utils.parseUnits("1");
      const listedAmount2 = 0;
      const sellUnit2 = 1;

      await expect(
        lootBoxInstance
          .connect(admin)
          .editSell(0, price2, sellUnit2, listedAmount2)
      ).to.be.revertedWith(LootBoxErrorMsg.INVALID_LISTED_AMOUNT);
    });

    it("should not allow to edit sell if sell unit is too low", async function () {
      // Create an sell
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 100;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      const price2 = ethers.utils.parseUnits("1");
      const listedAmount2 = 10;
      const sellUnit2 = 0;

      await expect(
        lootBoxInstance
          .connect(admin)
          .editSell(0, price2, sellUnit2, listedAmount2)
      ).to.be.revertedWith(LootBoxErrorMsg.INVALID_SELL_UNIT);
    });

    it("should not allow to edit sell if sell unit is larger than listed Amount", async function () {
      // Create an sell
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 100;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      const price2 = ethers.utils.parseUnits("1");
      const listedAmount2 = 10;
      const sellUnit2 = 100;

      await expect(
        lootBoxInstance
          .connect(admin)
          .editSell(0, price2, sellUnit2, listedAmount2)
      ).to.be.revertedWith(LootBoxErrorMsg.SELL_UNIT_IS_LARGER);
    });

    it("should not allow to edit sell if sell has not valid status", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 1;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      await lootBoxInstance.connect(addr2).buyItem(0);

      await expect(
        lootBoxInstance
          .connect(admin)
          .editSell(0, price, sellUnit, listedAmount)
      ).to.be.revertedWith(LootBoxErrorMsg.SOLD_NFT);
    });

    it("should allow to edit sell", async function () {
      // Create an sell
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 1;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      //new values
      const price2 = ethers.utils.parseUnits("2");
      const listedAmount2 = 200;
      const sellUnit2 = 2;

      const tx = await lootBoxInstance
        .connect(admin)
        .editSell(0, price2, sellUnit2, listedAmount2);

      await expect(tx)
        .to.emit(lootBoxInstance, "SellUpdated")
        .withArgs(0, price2, sellUnit2, listedAmount2);

      const sell = await lootBoxInstance.lootBoxSells(0);

      // Check that the sell has the correct details
      expect(sell.price).to.equal(price2);
      expect(sell.status).to.equal(0);
      expect(sell.listedAmount).to.equal(listedAmount2);
      expect(sell.sellUnit).to.equal(sellUnit2);
      expect(sell.soldAmount).to.equal(0);
    });
  });

  describe("test canceling a sell", function () {
    beforeEach(async function () {});
    it("should not allow to cancel sell when the sell does not exist", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 1;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      await lootBoxInstance.connect(addr2).buyItem(0);

      await expect(
        lootBoxInstance.connect(admin).cancelSell(0)
      ).to.be.revertedWith(LootBoxErrorMsg.ACTIVE_ORDER);
    });

    it("should allow to cancel sell", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 1;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      const tx = await lootBoxInstance.connect(admin).cancelSell(0);

      await expect(tx).to.emit(lootBoxInstance, "SellCanceled").withArgs(0);

      const sell = await lootBoxInstance.lootBoxSells(0);

      // Check that the sell has the correct details
      expect(sell.status).to.equal(2);
    });

    it("should not allow to cancel sell when the sell order is active", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 1;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      await lootBoxInstance.connect(addr2).buyItem(0);

      await expect(
        lootBoxInstance.connect(admin).cancelSell(0)
      ).to.be.revertedWith(LootBoxErrorMsg.ACTIVE_ORDER);
    });

    it("should not allow to cancel sell when the caller is not admin", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 1;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      await lootBoxInstance.connect(addr2).buyItem(0);

      await expect(
        lootBoxInstance.connect(addr1).cancelSell(0)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });
  });

  describe("test buy loot box", function () {
    beforeEach(async function () {});

    it("should allow to buy lootBox", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 1;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      userLootBoxes_before = await lootBoxInstance
        .connect(admin)
        .userLootBoxes(addr2.address, 0);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      //before buy
      const oldBuyerBalance = await lrtInstance.balanceOf(addr2.address);
      const oldSystemBalance = await lrtInstance.balanceOf(
        lootBoxInstance.address
      );

      const tx = await lootBoxInstance.connect(addr2).buyItem(0);

      const newBuyerBalance = await lrtInstance.balanceOf(addr2.address);
      const newSystemBalance = await lrtInstance.balanceOf(
        lootBoxInstance.address
      );

      await expect(tx)
        .to.emit(lootBoxInstance, "LootBoxBoughtWithBalance")
        .withArgs(0, addr2.address, sellUnit, price);

      const sell = await lootBoxInstance.lootBoxSells(0);

      userLootBoxes_after = await lootBoxInstance
        .connect(admin)
        .userLootBoxes(addr2.address, 0);

      expect(sell.status).to.equal(1);
      expect(sell.soldAmount).to.equal(1);

      expect(Number(userLootBoxes_after)).to.equal(userLootBoxes_before + 1);

      expect(sell.status).to.equal(1);
      expect(Number(newBuyerBalance)).to.equal(
        Number(Math.Big(oldBuyerBalance).sub(price))
      );

      expect(Number(newSystemBalance)).to.equal(
        Number(Math.Big(oldSystemBalance).add(price))
      );
    });

    it("should not allow to buy lootbox when status of listed NFTs is not be valid", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 1;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lootBoxInstance.connect(admin).cancelSell(0);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      await expect(
        lootBoxInstance.connect(addr2).buyItem(0)
      ).to.be.revertedWith(LootBoxErrorMsg.INVALID_STATUS_TO_SELL);
    });

    it("should set debt to buy lootbox when user has not sufficient balance-0", async function () {
      const price = ethers.utils.parseUnits("10");
      const listedAmount = 1;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("5"));

      // set up the vesting plan parameters
      const startDate =
        (await time.latest()) + (await Helper.convertToSeconds("days", 1));
      const cliff = await Helper.convertToSeconds("days", 1); // 1 day cliff86400;
      const duration = await Helper.convertToSeconds("weeks", 1); // 1 week vesting period
      const revocable = true;
      const poolName = ethers.utils.formatBytes32String("PreSale");
      const initialReleasePercentage = 5000;

      // create the vesting plan
      const txVestingPlan = await lrtVestingInstance
        .connect(admin)
        .createVestingPlan(
          startDate,
          cliff,
          duration,
          revocable,
          initialReleasePercentage,
          poolName
        );

      //create vesting schedules addr2
      const vestingAmount = ethers.utils.parseUnits("10");
      const planId = 0;

      const vestingStartDate =
        (await time.latest()) + (await Helper.convertToSeconds("days", 1)); // Start date 1 day from now
      await lrtVestingInstance
        .connect(admin)
        .createVesting(addr2.address, vestingStartDate, vestingAmount, planId);

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      //before buy
      const oldBuyerBalance = await lrtInstance.balanceOf(addr2.address);
      const oldSystemBalance = await lrtInstance.balanceOf(
        lootBoxInstance.address
      );

      const tx = await lootBoxInstance.connect(addr2).buyItem(0);

      const newBuyerBalance = await lrtInstance.balanceOf(addr2.address);
      const newSystemBalance = await lrtInstance.balanceOf(
        lootBoxInstance.address
      );

      await expect(tx)
        .to.emit(lootBoxInstance, "LootBoxBoughtWithVesting")
        .withArgs(0, addr2.address, sellUnit, price);

      const sell = await lootBoxInstance.lootBoxSells(0);

      userLootBoxes_after = await lootBoxInstance
        .connect(admin)
        .userLootBoxes(addr2.address, 0);

      expect(sell.status).to.equal(1);
      expect(sell.soldAmount).to.equal(1);

      expect(Number(userLootBoxes_after)).to.equal(userLootBoxes_before + 1);

      expect(sell.status).to.equal(1);
      expect(Number(newBuyerBalance)).to.equal(
        Number(Math.Big(oldBuyerBalance))
      );

      expect(Number(newSystemBalance)).to.equal(
        Number(Math.Big(oldSystemBalance))
      );

      const vestingStat = await lrtVestingInstance.holdersStat(addr2.address);
      expect(vestingStat.claimedAmount).to.equal(price);

      await expect(tx)
        .to.emit(lrtVestingInstance, "DebtCreated")
        .withArgs(price, addr2.address);
    });

    it("should not allow to buy lootBox when has allowance error", async function () {
      const price = ethers.utils.parseUnits("10");
      const listedAmount = 1;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, 0);

      await expect(
        lootBoxInstance.connect(addr2).buyItem(0)
      ).to.be.revertedWith(LootBoxErrorMsg.ALLOWANCE_ERROR);
    });

    it("should not allow to buy lootBox when sellunit+soldAmount is greater than listedAmount", async function () {
      const price = ethers.utils.parseUnits("10");
      const listedAmount = 10;
      const sellUnit = 10;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      const tx = await lootBoxInstance.connect(addr2).buyItem(0);

      const sell = await lootBoxInstance.lootBoxSells(0);

      await expect(
        lootBoxInstance.connect(addr2).buyItem(0)
      ).to.be.revertedWith(LootBoxErrorMsg.EXCEED_SELL);
    });

    it("should not allow to buy lootBox when has not sufficient vesting balance", async function () {
      const price = ethers.utils.parseUnits("10");
      const listedAmount = 10;
      const sellUnit = 10;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("5"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      await expect(
        lootBoxInstance.connect(addr2).buyItem(0)
      ).to.be.revertedWith(LootBoxErrorMsg.INSUFFICIENT_VESTED_BALANCE);
    });

    //test would be passed individually
    it("should not allow to buy non minted erc1155 token when The sell does not exist", async function () {
      const price = ethers.utils.parseUnits("1");

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      await expect(
        lootBoxInstance.connect(addr2).buyItem(2)
      ).to.be.revertedWith(LootBoxErrorMsg.INVALID_SELL);
    });
  });

  describe("test reveal Item ", function () {
    beforeEach(async function () {});

    it("should not allow to reveal item when the caller is not script", async function () {
      const tokenId = 0;

      await expect(
        lootBoxInstance
          .connect(addr1)
          .revealItem(0, collection_one, tokenId, addr2.address)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_SCRIPT);
    });

    it("should not allow to reveal item when sellId does not exist", async function () {
      const tokenId = 0;

      await expect(
        lootBoxInstance
          .connect(script)
          .revealItem(2, collection_one, tokenId, addr2.address)
      ).to.be.revertedWith(LootBoxErrorMsg.INVALID_SELL);
    });

    it("should not allow to reveal item when sellUnit is more than 1", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 10;
      const sellUnit = 5;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      const tokenId = 0;

      await expect(
        lootBoxInstance
          .connect(script)
          .revealItem(0, collection_one, tokenId, addr2.address)
      ).to.be.revertedWith(LootBoxErrorMsg.INVALID_SELL);
    });

    it("should not allow to reveal item when buyer has not any lootBox of the corresponding sellId", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 10;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      const tokenId = 0;

      await expect(
        lootBoxInstance
          .connect(script)
          .revealItem(0, collection_one, tokenId, addr2.address)
      ).to.be.revertedWith(LootBoxErrorMsg.INSUFFICIENT_LOOT_BOX_BALANCE);
    });

    it("should not allow to reveal item when collection is not active", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 10;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      const tx = await lootBoxInstance.connect(addr2).buyItem(0);

      userLootBoxes = await lootBoxInstance
        .connect(admin)
        .userLootBoxes(addr2.address, 0);

      await landRockerInstance
        .connect(admin)
        .setLandRockerCollection1155(collection_one, false);

      const tokenId = 0;

      await expect(
        lootBoxInstance
          .connect(script)
          .revealItem(0, collection_one, tokenId, addr2.address)
      ).to.be.revertedWith(LootBoxErrorMsg.NOT_ACTIVE_Collection);
    });

    it("should allow to reveal item", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 10;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      const tx = await lootBoxInstance.connect(addr2).buyItem(0);

      userLootBoxes_before = await lootBoxInstance
        .connect(admin)
        .userLootBoxes(addr2.address, 0);

      const tokenId = 0;

      const tx_revealItem = await lootBoxInstance
        .connect(script)
        .revealItem(0, collection_one, tokenId, addr2.address);

      userLootBoxes_after = await lootBoxInstance
        .connect(admin)
        .userLootBoxes(addr2.address, 0);

      await expect(tx_revealItem)
        .to.emit(lootBoxInstance, "LootBoxRevealed")
        .withArgs(0, collection_one, tokenId, addr2.address);

      expect(Number(userLootBoxes_after)).to.equal(userLootBoxes_before - 1);

      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);

      expect(
        await clone1
          .connect(approvedContract)
          .callStatic.balanceOf(addr2.address, tokenId)
      ).to.equal(sellUnit);
    });
  });

  describe("test reveal batch Item ", function () {
    beforeEach(async function () {});

    it("should not allow to reveal batch item when the caller is not script", async function () {
      const collections = [collection_one, collection_two];
      const tokenIds = [1, 3];

      await expect(
        lootBoxInstance
          .connect(addr1)
          .revealBatchItem(0, collections, tokenIds, addr2.address)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_SCRIPT);
    });

    // it("should not allow to reveal batch item when sellId does not exist", async function () {
    //   const collections = [collection_one, collection_two];
    //   const tokenIds = [1, 3];

    //   await expect(
    //     lootBoxInstance
    //       .connect(script)
    //       .revealBatchItem(2, collections, tokenIds, addr2.address)
    //   ).to.be.revertedWith(LootBoxErrorMsg.INVALID_SELL);
    // });

    it("should not allow to reveal batch item when sellUnit is not more than 1", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 10;
      const sellUnit = 1;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      const collections = [collection_one];
      const tokenIds = [1];

      await expect(
        lootBoxInstance
          .connect(script)
          .revealBatchItem(0, collections, tokenIds, addr2.address)
      ).to.be.revertedWith(LootBoxErrorMsg.INVALID_SELL);
    });

    it("should not allow to reveal batch item when buyer has not any lootBox of the corresponding sellId", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 10;
      const sellUnit = 2;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      const collections = [collection_one, collection_two];
      const tokenIds = [1, 3];

      await expect(
        lootBoxInstance
          .connect(script)
          .revealBatchItem(0, collections, tokenIds, addr2.address)
      ).to.be.revertedWith(LootBoxErrorMsg.INSUFFICIENT_LOOT_BOX_BALANCE);
    });

    it("should not allow to reveal batch item when collection is not active", async function () {
      const price = ethers.utils.parseUnits("10");
      const listedAmount = 20;
      const sellUnit = 2;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      const tx = await lootBoxInstance.connect(addr2).buyItem(0);

      userLootBoxes = await lootBoxInstance
        .connect(admin)
        .userLootBoxes(addr2.address, 0);

      await landRockerInstance
        .connect(admin)
        .setLandRockerCollection1155(collection_one, false);

      const collections = [collection_one, collection_two];
      const tokenIds = [1, 3];

      await expect(
        lootBoxInstance
          .connect(script)
          .revealBatchItem(0, collections, tokenIds, addr2.address)
      ).to.be.revertedWith(LootBoxErrorMsg.NOT_ACTIVE_Collection);
    });

    it("should not allow to reveal batch item by invalid parameters", async function () {
      const price = ethers.utils.parseUnits("10");
      const listedAmount = 20;
      const sellUnit = 2;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      const tx = await lootBoxInstance.connect(addr2).buyItem(0);

      userLootBoxes = await lootBoxInstance
        .connect(admin)
        .userLootBoxes(addr2.address, 0);

      await landRockerInstance
        .connect(admin)
        .setLandRockerCollection1155(collection_one, false);

      const collections = [collection_one, collection_two];
      const tokenIds = [1, 3, 4];

      await expect(
        lootBoxInstance
          .connect(script)
          .revealBatchItem(0, collections, tokenIds, addr2.address)
      ).to.be.revertedWith(LootBoxErrorMsg.INVALID_PARAMETERS);
    });

    it("should allow to reveal batch item", async function () {
      const price = ethers.utils.parseUnits("1");
      const listedAmount = 20;
      const sellUnit = 2;

      await lootBoxInstance
        .connect(admin)
        .createSell(price, sellUnit, listedAmount);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance.connect(addr2).approve(lootBoxInstance.address, price);

      const tx = await lootBoxInstance.connect(addr2).buyItem(0);

      userLootBoxes_before = await lootBoxInstance
        .connect(admin)
        .userLootBoxes(addr2.address, 0);

      const collections = [collection_one, collection_two];
      const tokenIds = [1, 3];

      const tx_revealItem = await lootBoxInstance
        .connect(script)
        .revealBatchItem(0, collections, tokenIds, addr2.address);

      userLootBoxes_after = await lootBoxInstance
        .connect(admin)
        .userLootBoxes(addr2.address, 0);

      await expect(tx_revealItem)
        .to.emit(lootBoxInstance, "LootBoxBatchRevealed")
        .withArgs(0,0, collection_one, 1, addr2.address);

      await expect(tx_revealItem)
        .to.emit(lootBoxInstance, "LootBoxBatchRevealed")
        .withArgs(1,0,collection_two, 3, addr2.address);

      expect(Number(userLootBoxes_after)).to.equal(userLootBoxes_before - 1);

      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);
      const clone2 = cloneContract.attach(collection_two);

      expect(
        await clone1
          .connect(approvedContract)
          .callStatic.balanceOf(addr2.address, 1)
      ).to.equal(1);

      expect(
        await clone2
          .connect(approvedContract)
          .callStatic.balanceOf(addr2.address, 3)
      ).to.equal(1);
    });
  });

  //Upgradeability testing
  // describe("Contract Version 2 test", function () {
  //   let oldContract, upgradedContract, owner, addr1;
  //   beforeEach(async function () {
  //     [owner, addr1] = await ethers.getSigners(2);

  //     const LootBoxUpgraded = await ethers.getContractFactory(
  //       "LootBoxUpgraded"
  //     );

  //     upgradedContract = await upgrades.upgradeProxy(
  //       lootBoxInstance,
  //       LootBoxUpgraded,
  //       {
  //         call: {
  //           fn: "initializeLootBox",
  //           args: [
  //             arInstance.address,
  //             lrtInstance.address,
  //             landRockerInstance.address,
  //             lrtVestingInstance.address,
  //             "hi I'm upgraded",
  //           ],
  //         },
  //       }
  //     );
  //   });

  //   it("New Contract Should return the old & new greeting and token name after deployment", async function () {
  //     expect(await upgradedContract.greeting()).to.equal("hi I'm upgraded");
  //   });
  // });
});
