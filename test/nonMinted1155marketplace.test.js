const { expect, util } = require("chai");
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");

const {
  MarketplaceErrorMsg,
  AccessErrorMsg,
  NonMinted1155ErrorMsg,
  LR1155Message,
} = require("./messages");
const { ethers, network } = require("hardhat");

const Math = require("./helper/math");

const {
  nonMinted1155MarketplaceFixture,
} = require("./fixture/nonMinted1155Marketplace.fixture");
const Helper = require("./helper");
const { balance } = require("@openzeppelin/test-helpers");
const address = require("ethers-utils/address");

const zeroAddress = "0x0000000000000000000000000000000000000000";

describe("NonMinted1155 Marketplace contract", function () {
  let nonMinted1155MarketplaceInstance,
    landRockerERC1155FactoryInstance,
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

  beforeEach(async function () {
    ({
      landRockerERC1155FactoryInstance,
      nonMinted1155MarketplaceInstance,
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
    } = await loadFixture(nonMinted1155MarketplaceFixture));

    discountExpireDate =
      (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
  });

  describe("test setUserDiscount", function () {
    it("should allow to set UserDiscount", async function () {
      const tx = await nonMinted1155MarketplaceInstance
        .connect(script)
        .setUserDiscount(
          addr2.address,
          discountPercentage,
          discountExpireDate,
          5,
          cap
        );

      await expect(tx)
        .to.emit(nonMinted1155MarketplaceInstance, "UserDiscountSet")
        .withArgs(
          addr2.address,
          discountPercentage,
          discountExpireDate,
          5,
          cap
        );

      const userDiscount = await nonMinted1155MarketplaceInstance.userDiscounts(
        addr2.address
      );

      expect(Number(userDiscount.discountRate)).to.equal(discountPercentage);
      expect(Number(userDiscount.expireDate)).to.equal(discountExpireDate);
      expect(userDiscount.usageLimit).to.equal(5);
      expect(Number(userDiscount.discountCap)).to.equal(Number(Math.Big(cap)));
    });

    it("should not allow to set UserDiscount when caller is not admin", async function () {
      await expect(
        nonMinted1155MarketplaceInstance
          .connect(addr2)
          .setUserDiscount(
            addr2.address,
            discountPercentage,
            discountExpireDate,
            5,
            cap
          )
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_SCRIPT);
    });

    it("should not allow to set UserDiscount when user address is not valid", async function () {
      await expect(
        nonMinted1155MarketplaceInstance
          .connect(script)
          .setUserDiscount(
            zeroAddress,
            discountPercentage,
            discountExpireDate,
            5,
            cap
          )
      ).to.be.revertedWith(NonMinted1155ErrorMsg.NOT_VALID_ADDRESS);
    });

    it("should not allow to set UserDiscount when expiration date is not valid", async function () {
      await expect(
        nonMinted1155MarketplaceInstance
          .connect(script)
          .setUserDiscount(
            addr2.address,
            discountPercentage,
            (await time.latest()) - (await Helper.convertToSeconds("weeks", 1)),
            5,
            cap
          )
      ).to.be.revertedWith(NonMinted1155ErrorMsg.INVALID_EXPIRE_DATE);
    });

    it("should not allow to set UserDiscount when cap is not valid", async function () {
      await expect(
        nonMinted1155MarketplaceInstance
          .connect(script)
          .setUserDiscount(
            addr2.address,
            discountPercentage,
            discountExpireDate,
            5,
            0
          )
      ).to.be.revertedWith(NonMinted1155ErrorMsg.NOT_VALID_DISCOUNT_CAP);
    });

    it("should not allow to set UserDiscount when discount rate is not valid", async function () {
      await expect(
        nonMinted1155MarketplaceInstance
          .connect(script)
          .setUserDiscount(addr2.address, 0, discountExpireDate, 5, cap)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.INVALID_DISCOUNT_RATE);
    });

    it("should not allow to set UserDiscount when count is less than user usedDiscount", async function () {
      const price = ethers.utils.parseUnits("5");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );
      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      await nonMinted1155MarketplaceInstance
        .connect(script)
        .setUserDiscount(addr2.address, 1000, discountExpireDate, 1, cap);

      await nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0);

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(script)
          .setUserDiscount(
            addr2.address,
            discountPercentage,
            discountExpireDate,
            0,
            cap
          )
      ).to.be.revertedWith(
        NonMinted1155ErrorMsg.NOT_VALID_DISCOUNT_USAGE_LIMIT
      );
    });

    it("should not allow to set UserDiscount when usage limit is zero", async function () {
      await expect(
        nonMinted1155MarketplaceInstance
          .connect(script)
          .setUserDiscount(
            addr2.address,
            discountPercentage,
            discountExpireDate,
            0,
            cap
          )
      ).to.be.revertedWith(
        NonMinted1155ErrorMsg.NOT_VALID_DISCOUNT_USAGE_LIMIT
      );
    });
  });

  describe("test withdraw", function () {
    beforeEach(async function () {
      const price = ethers.utils.parseUnits("5");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const royaltyPercentage = 200;
      const tokenId = 0;

      const systemFee = await landRockerInstance.systemFee();
      const treasury1155 = await landRockerInstance.treasury1155();

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      const tx = await nonMinted1155MarketplaceInstance
        .connect(script)
        .setUserDiscount(addr2.address, 1000, discountExpireDate, 5, cap);

      await nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0);
    });

    it("should allow to withdraw contract balance", async function () {
      const amount = ethers.utils.parseUnits("0.002", 18);
      const treasuryAddress = await landRockerInstance.treasury();
      const oldTreasury = await lrtInstance.balanceOf(treasuryAddress);
      const oldSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      ethers.utils.formatUnits(
        await lrtInstance.balanceOf(nonMinted1155MarketplaceInstance.address)
      ),
        "after buy";

      const tx = await nonMinted1155MarketplaceInstance
        .connect(admin)
        .withdraw(amount);

      await expect(tx)
        .to.emit(nonMinted1155MarketplaceInstance, "Withdrawn")
        .withArgs(amount, treasuryAddress);

      const newTreasury = await lrtInstance.balanceOf(treasuryAddress);
      const newSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
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
        nonMinted1155MarketplaceInstance.connect(addr1).withdraw(amount)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not allow to withdraw sell if amount is too low", async function () {
      const amount = ethers.utils.parseUnits("0", 18);

      await expect(
        nonMinted1155MarketplaceInstance.connect(admin).withdraw(amount)
      ).to.be.revertedWith(MarketplaceErrorMsg.TOO_LOW_AMOUNT);
    });

    it("should not allow to withdraw sell if balance insufficient", async function () {
      const amount = ethers.utils.parseUnits("1000", 18);

      await expect(
        nonMinted1155MarketplaceInstance.connect(admin).withdraw(amount)
      ).to.be.revertedWith(MarketplaceErrorMsg.NO_BALANCE_WITHDRAW);
    });
  });

  describe("test create Sell", function () {
    beforeEach(async function () {
      const tx = await nonMinted1155MarketplaceInstance
        .connect(script)
        .setUserDiscount(addr2.address, 1000, discountExpireDate, 5, cap);
    });

    it("should allow to create sell", async function () {
      // Create an sell
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 100;
      const sellUnit = 1;
      const tokenId = 0;

      const tx = await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      const sell = await nonMinted1155MarketplaceInstance.nonMinted1155Sells(0);

      await expect(tx)
        .to.emit(nonMinted1155MarketplaceInstance, "SellCreated")
        .withArgs(
          0,
          nonMinted1155MarketplaceInstance.address,
          collection_one,
          expireDate,
          price,
          listedAmount,
          sellUnit,
          sell.tokenId
        );

      // Check that the sell has the correct details
      expect(sell.sellData.price).to.equal(price);
      expect(sell.sellData.status).to.equal(0);
      expect(sell.sellData.collection).to.equal(collection_one);
      expect(sell.sellData.expireDate).to.equal(expireDate);
      expect(sell.listedAmount).to.equal(listedAmount);
      expect(sell.sellUnit).to.equal(sellUnit);
      expect(sell.tokenId).to.equal(0);

      expect(sell.soldAmount).to.equal(0);

      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);

      // expect(
      //   await clone1
      //     .connect(approvedContract)
      //     .callStatic.balanceOf(
      //       nonMinted1155MarketplaceInstance.address,
      //       sell.tokenId
      //     )
      // ).to.equal(listedAmount);
    });

    it("should not allow to create sell if caller is not admin", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 100;
      const sellUnit = 1;
      const tokenId = 0;

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(addr2)
          .createSell(
            price,
            collection_one,
            expireDate,
            listedAmount,
            sellUnit,
            tokenId
          )
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not allow to create sell if collection is not active", async function () {
      const price = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 100;
      const sellUnit = 1;
      const tokenId = 0;

      await landRockerInstance
        .connect(admin)
        .setLandRockerCollection1155(collection_one, false);

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(admin)
          .createSell(
            price,
            collection_one,
            expireDate,
            listedAmount,
            sellUnit,
            tokenId
          )
      ).to.be.revertedWith(NonMinted1155ErrorMsg.COLLECTION_NOT_ACTIVE);
    });

    it("should not allow to create sell if listed Amount is too low", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 0;
      const sellUnit = 1;
      const tokenId = 0;

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(admin)
          .createSell(
            price,
            collection_one,
            expireDate,
            listedAmount,
            sellUnit,
            tokenId
          )
      ).to.be.revertedWith(NonMinted1155ErrorMsg.INVALID_LISTED_AMOUNT);
    });

    // it("should not allow to create sell when price is less than floor price", async function () {
    //   const itemId = 0;
    //   const price = ethers.utils.parseUnits("1");
    //   const floorPrice = ethers.utils.parseUnits("5");
    //   const expireDate =
    //     (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
    //   const tokenId = 0;

    //   await expect(
    //     nonMinted1155MarketplaceInstance
    //       .connect(admin)
    //       .createSell(price, collection_one, expireDate, 10, 5, tokenId)
    //   ).to.be.revertedWith(NonMinted1155ErrorMsg.INVALID_PRICE);
    // });

    // it("should not allow to create sell if collection is false", async function () {
    //   const price = ethers.utils.parseUnits("1");
    //   const floorPrice = ethers.utils.parseUnits("1");
    //   const itemId = 0;
    //   const tokenId = 0;

    //   const expireDate =
    //     (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));

    //   let falseCollection = await nonMinted1155MarketplaceInstance
    //     .connect(admin)
    //     .setLandRockerCollection(collection_one, false);

    //   await expect(
    //     nonMinted1155MarketplaceInstance
    //       .connect(admin)
    //       .createSell(
    //         price,
    //         collection_one,
    //         expireDate,
    //         10,
    //         5,
    //         tokenId
    //       )
    //   ).to.be.revertedWith(NonMinted1155ErrorMsg.INVALID_TOKEN);
    // });

    it("should not allow to create sell if sell unit is too low", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 10;
      const sellUnit = 0;
      const tokenId = 0;

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(admin)
          .createSell(
            price,
            collection_one,
            expireDate,
            listedAmount,
            sellUnit,
            tokenId
          )
      ).to.be.revertedWith(NonMinted1155ErrorMsg.INVALID_SELL_UNIT);
    });

    it("should not allow to create sell if sell unit is larger than listed Amount", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 10;
      const sellUnit = 100;
      const tokenId = 0;

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(admin)
          .createSell(
            price,
            collection_one,
            expireDate,
            listedAmount,
            sellUnit,
            tokenId
          )
      ).to.be.revertedWith(NonMinted1155ErrorMsg.SELL_UNIT_IS_LARGER);
    });

    it("should not allow to create sell if expire date is invalid", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = await time.latest();
      const listedAmount = 1000;
      const sellUnit = 10;
      const tokenId = 0;

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(admin)
          .createSell(
            price,
            collection_one,
            expireDate,
            listedAmount,
            sellUnit,
            tokenId
          )
      ).to.be.revertedWith(MarketplaceErrorMsg.INVALID_EXPIRE_DATE);
    });

    it("should not allow to create sell if listed amount is not a coefficient of sell unit", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 6;
      const tokenId = 0;

      const treasury1155 = await landRockerInstance.treasury1155();

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(admin)
          .createSell(
            price,
            collection_one,
            expireDate,
            listedAmount,
            sellUnit,
            tokenId
          )
      ).to.be.revertedWith(NonMinted1155ErrorMsg.NOT_COEFFICIENT_OF_SELL_UNIT);
    });
  });

  describe("test edit sell", function () {
    beforeEach(async function () {
      const tx = await nonMinted1155MarketplaceInstance
        .connect(script)
        .setUserDiscount(addr2.address, 1000, discountExpireDate, 5, cap);
    });

    it("should not allow to edit sell when The sell does not exist", async function () {
      //new values
      const price2 = ethers.utils.parseUnits("2");
      const floorPrice2 = ethers.utils.parseUnits("1");
      const expireDate2 =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 2));
      const listedAmount2 = 50;
      const sellUnit2 = 2;
      const tokenId = 0;

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(admin)
          .editSell(0, price2, expireDate2, listedAmount2, sellUnit2, tokenId)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.INVALID_SELL);
    });

    it("should not allow to edit sell when listedAmount lower than old listedAmount", async function () {
      // Create an sell
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 100;
      const sellUnit = 1;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      //new values
      const price2 = ethers.utils.parseUnits("2");
      const expireDate2 =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 2));
      const listedAmount2 = 50;
      const sellUnit2 = 2;
      const tokenId2 = 1;

      const tx = await nonMinted1155MarketplaceInstance
        .connect(admin)
        .editSell(0, price2, expireDate2, listedAmount2, sellUnit2, tokenId2);

      await expect(tx)
        .to.emit(nonMinted1155MarketplaceInstance, "SellUpdated")
        .withArgs(
          0,
          collection_one,
          expireDate2,
          price2,
          listedAmount2,
          sellUnit2,
          tokenId2
        );

      const sell = await nonMinted1155MarketplaceInstance.nonMinted1155Sells(0);

      // Check that the sell has the correct details
      expect(sell.sellData.price).to.equal(price2);
      expect(sell.sellData.status).to.equal(0);
      expect(sell.sellData.collection).to.equal(collection_one);
      expect(sell.sellData.expireDate).to.equal(expireDate2);
      expect(sell.listedAmount).to.equal(listedAmount2);
      expect(sell.sellUnit).to.equal(sellUnit2);
      expect(sell.soldAmount).to.equal(0);

      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);

      // expect(
      //   await clone1
      //     .connect(approvedContract)
      //     .callStatic.balanceOf(
      //       nonMinted1155MarketplaceInstance.address,
      //       sell.tokenId
      //     )
      // ).to.equal(listedAmount2);
    });

    it("should not allow to edit sell when listedAmount is Invalid", async function () {
      // Create an sell
      const price = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 10;
      const sellUnit = 5;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      await nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0);

      //new values
      const price2 = ethers.utils.parseUnits("2");
      const expireDate2 =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 2));
      const listedAmount2 = 4;
      const sellUnit2 = 2;
      const tokenId2 = 1;

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(admin)
          .editSell(0, price2, expireDate2, listedAmount2, sellUnit2, tokenId2)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.INVALID_LISTED_AMOUNT_SOLD);
    });

    it("should allow to edit sell when listedAmount larger or equal to old listedAmount", async function () {
      // Create an sell
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 100;
      const sellUnit = 1;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      //new values
      const price2 = ethers.utils.parseUnits("2");
      const expireDate2 =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 2));
      const listedAmount2 = 200;
      const sellUnit2 = 2;
      const tokenId2 = 1;

      const tx = await nonMinted1155MarketplaceInstance
        .connect(admin)
        .editSell(0, price2, expireDate2, listedAmount2, sellUnit2, tokenId2);

      await expect(tx)
        .to.emit(nonMinted1155MarketplaceInstance, "SellUpdated")
        .withArgs(
          0,
          collection_one,
          expireDate2,
          price2,
          listedAmount2,
          sellUnit2,
          tokenId2
        );

      const sell = await nonMinted1155MarketplaceInstance.nonMinted1155Sells(0);

      // Check that the sell has the correct details
      expect(sell.sellData.price).to.equal(price2);
      expect(sell.sellData.status).to.equal(0);
      expect(sell.sellData.collection).to.equal(collection_one);
      expect(sell.sellData.expireDate).to.equal(expireDate2);
      expect(sell.listedAmount).to.equal(listedAmount2);
      expect(sell.sellUnit).to.equal(sellUnit2);
      expect(sell.soldAmount).to.equal(0);
      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);

      // expect(
      //   await clone1
      //     .connect(approvedContract)
      //     .callStatic.balanceOf(
      //       nonMinted1155MarketplaceInstance.address,
      //       sell.tokenId
      //     )
      // ).to.equal(listedAmount2);
    });

    it("should not allow to edit sell if caller is not admin", async function () {
      const price = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 100;
      const sellUnit = 1;
      const tokenId = 0;

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(addr2)
          .editSell(0, price, expireDate, listedAmount, sellUnit, tokenId)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should not allow to edit sell if listed Amount is too low", async function () {
      // Create an sell
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 100;
      const sellUnit = 1;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      const price2 = ethers.utils.parseUnits("1");
      const expireDate2 =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount2 = 0;
      const sellUnit2 = 1;
      const tokenId2 = 1;

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(admin)
          .editSell(0, price2, expireDate2, listedAmount2, sellUnit2, tokenId2)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.INVALID_LISTED_AMOUNT);
    });

    it("should not allow to edit sell if sell unit is too low", async function () {
      // Create an sell
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 100;
      const sellUnit = 1;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      const price2 = ethers.utils.parseUnits("1");
      const expireDate2 =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount2 = 10;
      const sellUnit2 = 0;
      const tokenId2 = 1;

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(admin)
          .editSell(0, price2, expireDate2, listedAmount2, sellUnit2, tokenId2)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.INVALID_SELL_UNIT);
    });

    it("should not allow to edit sell if sell unit is larger than listed Amount", async function () {
      // Create an sell
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 100;
      const sellUnit = 1;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      const price2 = ethers.utils.parseUnits("1");
      const expireDate2 =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount2 = 10;
      const sellUnit2 = 100;
      const tokenId2 = 0;

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(admin)
          .editSell(0, price2, expireDate2, listedAmount2, sellUnit2, tokenId2)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.SELL_UNIT_IS_LARGER);
    });

    it("should not allow to edit sell if expire date is invalid", async function () {
      const price = ethers.utils.parseUnits("1");
      const expireDate = await time.latest();
      const listedAmount = 1000;
      const sellUnit = 10;
      const tokenId = 0;

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(admin)
          .editSell(0, price, expireDate, listedAmount, sellUnit, tokenId)
      ).to.be.revertedWith(MarketplaceErrorMsg.INVALID_EXPIRE_DATE);
    });

    it("should not allow to edit sell if sell has not valid status", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const tokenId = 0;
      const tokenId2 = 1;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      await nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0);

      await expect(
        nonMinted1155MarketplaceInstance
          .connect(admin)
          .editSell(0, price, expireDate, listedAmount, sellUnit, tokenId2)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.SOLD_NFT);
    });
  });

  describe("test buy NFT", function () {
    beforeEach(async function () {
      const tx = await nonMinted1155MarketplaceInstance
        .connect(script)
        .setUserDiscount(
          addr2.address,
          discountPercentage,
          discountExpireDate,
          5,
          cap
        );
    });
    //test would be passed individually
    // it("should not allow to buy non minted erc1155 token when The sell does not exist", async function () {
    //   const price = ethers.utils.parseUnits("1");

    //   await lrtInstance
    //     .connect(distributor)
    //     .transferToken(addr2.address, ethers.utils.parseUnits("500"));

    //   await lrtInstance
    //     .connect(addr2)
    //     .approve(nonMinted1155MarketplaceInstance.address, price);

    //   await expect(
    //     nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0)
    //   ).to.be.revertedWith(NonMinted1155ErrorMsg.INVALID_SELL);
    // });

    it("should allow to buy non minted erc1155 token", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const royaltyPercentage = 200;
      const systemFee = await landRockerInstance.systemFee();
      const treasury1155 = await landRockerInstance.treasury1155();
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      //before buy
      const oldBuyerBalance = await lrtInstance.balanceOf(addr2.address);
      const oldTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const oldSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      const oldRoyaltyRecipientBalance = await lrtInstance.balanceOf(
        royaltyRecipient.address
      );

      const tx = await nonMinted1155MarketplaceInstance
        .connect(addr2)
        .buyItem(0);

      const newBuyerBalance = await lrtInstance.balanceOf(addr2.address);
      const newTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const newSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      const newRoyaltyRecipientBalance = await lrtInstance.balanceOf(
        royaltyRecipient.address
      );

      let totalPayment = 0;
      const discountAmount = price
        .mul(discountPercentage)
        .div(ethers.BigNumber.from("10000"));

      if (discountAmount > cap) {
        totalPayment = price.sub(cap);
      } else {
        totalPayment = price.sub(discountAmount);
      }

      let systemPortion = Math.Big(systemFee).mul(totalPayment).div(10000);
      let totalPay = Math.Big(totalPayment).sub(systemPortion);
      let royaltyAmount = Math.Big(totalPayment)
        .mul(royaltyPercentage)
        .div(10000);

      await expect(tx)
        .to.emit(nonMinted1155MarketplaceInstance, "AssetBought1155WithBalance")
        .withArgs(0, addr2.address, tokenId, sellUnit, price, totalPayment);

      const sell = await nonMinted1155MarketplaceInstance.nonMinted1155Sells(0);
      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);

      expect(
        await clone1
          .connect(approvedContract)
          .callStatic.balanceOf(addr2.address, sell.tokenId)
      ).to.equal(10);
      expect(sell.sellData.status).to.equal(1);
      expect(Number(newBuyerBalance)).to.equal(
        Number(Math.Big(oldBuyerBalance).sub(totalPayment))
      );
      expect(Number(newTreasury1155)).to.equal(
        Number(
          Math.Big(oldTreasury1155).add(Math.Big(totalPay).sub(royaltyAmount))
        )
      );
      expect(Number(newRoyaltyRecipientBalance)).to.equal(
        Number(Math.Big(oldRoyaltyRecipientBalance).add(royaltyAmount))
      );
      expect(Number(newSystemBalance)).to.equal(
        Number(Math.Big(oldSystemBalance).add(systemPortion))
      );
    });

    it("should allow to buy non minted erc1155 token when discount is zero", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const royaltyPercentage = 200;
      const systemFee = await landRockerInstance.systemFee();
      const treasury1155 = await landRockerInstance.treasury1155();
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr1.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr1)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      //before buy
      const oldBuyerBalance = await lrtInstance.balanceOf(addr1.address);
      const oldTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const oldSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      const oldRoyaltyRecipientBalance = await lrtInstance.balanceOf(
        royaltyRecipient.address
      );

      const userDiscount = await nonMinted1155MarketplaceInstance.userDiscounts(
        addr1.address
      );

      const tx = await nonMinted1155MarketplaceInstance
        .connect(addr1)
        .buyItem(0);

      const newBuyerBalance = await lrtInstance.balanceOf(addr1.address);
      const newTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const newSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      const newRoyaltyRecipientBalance = await lrtInstance.balanceOf(
        royaltyRecipient.address
      );

      let totalPayment = price;

      if (userDiscount.discountRate > 0) {
        const discountAmount = price
          .mul(discountPercentage)
          .div(ethers.BigNumber.from("10000"));

        if (discountAmount > cap) {
          totalPayment = price.sub(cap);
        } else {
          totalPayment = price.sub(discountAmount);
        }
      }

      let systemPortion = Math.Big(systemFee).mul(totalPayment).div(10000);
      let totalPay = Math.Big(totalPayment).sub(systemPortion);
      let royaltyAmount = Math.Big(totalPayment)
        .mul(royaltyPercentage)
        .div(10000);

      await expect(tx)
        .to.emit(nonMinted1155MarketplaceInstance, "AssetBought1155WithBalance")
        .withArgs(0, addr1.address, tokenId, sellUnit, price, totalPayment);

      const sell = await nonMinted1155MarketplaceInstance.nonMinted1155Sells(0);
      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);

      expect(
        await clone1
          .connect(approvedContract)
          .callStatic.balanceOf(addr1.address, sell.tokenId)
      ).to.equal(10);
      expect(sell.sellData.status).to.equal(1);
      expect(Number(newBuyerBalance)).to.equal(
        Number(Math.Big(oldBuyerBalance).sub(totalPayment))
      );
      expect(Number(newTreasury1155)).to.equal(
        Number(
          Math.Big(oldTreasury1155).add(Math.Big(totalPay).sub(royaltyAmount))
        )
      );
      expect(Number(newRoyaltyRecipientBalance)).to.equal(
        Number(Math.Big(oldRoyaltyRecipientBalance).add(royaltyAmount))
      );
      expect(Number(newSystemBalance)).to.equal(
        Number(Math.Big(oldSystemBalance).add(systemPortion))
      );
    });

    it("should allow to buy non minted erc1155 token when discount expiration time has expired", async function () {
      const price = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const royaltyPercentage = 200;
      const systemFee = await landRockerInstance.systemFee();
      const treasury1155 = await landRockerInstance.treasury1155();
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr1.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr1)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      //before buy
      const oldBuyerBalance = await lrtInstance.balanceOf(addr1.address);
      const oldTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const oldSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      const oldRoyaltyRecipientBalance = await lrtInstance.balanceOf(
        royaltyRecipient.address
      );

      await nonMinted1155MarketplaceInstance
        .connect(script)
        .setUserDiscount(addr1.address, 5000, discountExpireDate, 5, cap);

      const userDiscount = await nonMinted1155MarketplaceInstance.userDiscounts(
        addr1.address
      );

      const elapsedTime = await Helper.convertToSeconds("years", 20);

      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      const tx = await nonMinted1155MarketplaceInstance
        .connect(addr1)
        .buyItem(0);

      const newBuyerBalance = await lrtInstance.balanceOf(addr1.address);
      const newTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const newSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      const newRoyaltyRecipientBalance = await lrtInstance.balanceOf(
        royaltyRecipient.address
      );

      let totalPayment = price;

      // if(userDiscount.discountRate > 0) {
      //   const discountAmount = price
      //   .mul(discountPercentage)
      //   .div(ethers.BigNumber.from("10000"));

      // if (discountAmount > cap) {
      //   totalPayment = price.sub(cap);
      // } else {
      //   totalPayment = price.sub(discountAmount);
      // }
      // }

      let systemPortion = Math.Big(systemFee).mul(totalPayment).div(10000);
      let totalPay = Math.Big(totalPayment).sub(systemPortion);
      let royaltyAmount = Math.Big(totalPayment)
        .mul(royaltyPercentage)
        .div(10000);

      await expect(tx)
        .to.emit(nonMinted1155MarketplaceInstance, "AssetBought1155WithBalance")
        .withArgs(0, addr1.address, tokenId, sellUnit, price, totalPayment);

      const sell = await nonMinted1155MarketplaceInstance.nonMinted1155Sells(0);
      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);

      expect(
        await clone1
          .connect(approvedContract)
          .callStatic.balanceOf(addr1.address, sell.tokenId)
      ).to.equal(10);
      expect(sell.sellData.status).to.equal(1);
      expect(Number(newBuyerBalance)).to.equal(
        Number(Math.Big(oldBuyerBalance).sub(totalPayment))
      );
      expect(Number(newTreasury1155)).to.equal(
        Number(
          Math.Big(oldTreasury1155).add(Math.Big(totalPay).sub(royaltyAmount))
        )
      );
      expect(Number(newRoyaltyRecipientBalance)).to.equal(
        Number(Math.Big(oldRoyaltyRecipientBalance).add(royaltyAmount))
      );
      expect(Number(newSystemBalance)).to.equal(
        Number(Math.Big(oldSystemBalance).add(systemPortion))
      );
    });

    it("should allow to buy non minted erc1155 token when discount amount > discount cap", async function () {
      const price = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const royaltyPercentage = 200;
      const systemFee = await landRockerInstance.systemFee();
      const treasury1155 = await landRockerInstance.treasury1155();
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr1.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr1)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      //before buy
      const oldBuyerBalance = await lrtInstance.balanceOf(addr1.address);
      const oldTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const oldSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      const oldRoyaltyRecipientBalance = await lrtInstance.balanceOf(
        royaltyRecipient.address
      );

      await nonMinted1155MarketplaceInstance
        .connect(script)
        .setUserDiscount(
          addr1.address,
          9000,
          discountExpireDate,
          5,
          ethers.utils.parseUnits("0.5")
        );

      const userDiscount = await nonMinted1155MarketplaceInstance.userDiscounts(
        addr1.address
      );

      const tx = await nonMinted1155MarketplaceInstance
        .connect(addr1)
        .buyItem(0);

      const newBuyerBalance = await lrtInstance.balanceOf(addr1.address);
      const newTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const newSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      const newRoyaltyRecipientBalance = await lrtInstance.balanceOf(
        royaltyRecipient.address
      );

      let totalPayment = price;

      if (userDiscount.discountRate > 0) {
        const discountAmount = price
          .mul(9000)
          .div(ethers.BigNumber.from("10000"));

        if (discountAmount > ethers.utils.parseUnits("0.5")) {
          totalPayment = price.sub(ethers.utils.parseUnits("0.5"));
        } else {
          totalPayment = price.sub(discountAmount);
        }
      }

      let systemPortion = Math.Big(systemFee).mul(totalPayment).div(10000);
      let totalPay = Math.Big(totalPayment).sub(systemPortion);
      let royaltyAmount = Math.Big(totalPayment)
        .mul(royaltyPercentage)
        .div(10000);

      await expect(tx)
        .to.emit(nonMinted1155MarketplaceInstance, "AssetBought1155WithBalance")
        .withArgs(0, addr1.address, tokenId, sellUnit, price, totalPayment);

      const sell = await nonMinted1155MarketplaceInstance.nonMinted1155Sells(0);
      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);

      expect(
        await clone1
          .connect(approvedContract)
          .callStatic.balanceOf(addr1.address, sell.tokenId)
      ).to.equal(10);
      expect(sell.sellData.status).to.equal(1);
      expect(Number(newBuyerBalance)).to.equal(
        Number(Math.Big(oldBuyerBalance).sub(totalPayment))
      );
      expect(Number(newTreasury1155)).to.equal(
        Number(
          Math.Big(oldTreasury1155).add(Math.Big(totalPay).sub(royaltyAmount))
        )
      );
      expect(Number(newRoyaltyRecipientBalance)).to.equal(
        Number(Math.Big(oldRoyaltyRecipientBalance).add(royaltyAmount))
      );
      expect(Number(newSystemBalance)).to.equal(
        Number(Math.Big(oldSystemBalance).add(systemPortion))
      );
    });

    it("should allow to buy non minted erc1155 token with zero royalty amount", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const royaltyPercentage = 0;
      const systemFee = await landRockerInstance.systemFee();
      const treasury1155 = await landRockerInstance.treasury1155();
      const tokenId = 0;
      // const royaltyRecipient = addr1.address;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      //before buy
      const oldBuyerBalance = await lrtInstance.balanceOf(addr2.address);

      const oldTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const oldSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      const oldRoyaltyBalance = await lrtInstance.balanceOf(
        royaltyRecipient.address
      );

      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);

      await clone1.connect(admin).deleteDefaultRoyalty();

      const tx = await nonMinted1155MarketplaceInstance
        .connect(addr2)
        .buyItem(0);

      const newBuyerBalance = await lrtInstance.balanceOf(addr2.address);
      const newTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const newSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      const newRoyaltyBalance = await lrtInstance.balanceOf(
        royaltyRecipient.address
      );

      let totalPayment = 0;
      const discountAmount = price
        .mul(1000)
        .div(ethers.BigNumber.from("10000"));

      if (discountAmount > cap) {
        totalPayment = price.sub(cap);
      } else {
        totalPayment = price.sub(discountAmount);
      }

      let systemPortion = Math.Big(systemFee).mul(totalPayment).div(10000);
      let totalPay = Math.Big(totalPayment).sub(systemPortion);
      let royaltyAmount = Math.Big(totalPayment)
        .mul(royaltyPercentage)
        .div(10000);

      const sell = await nonMinted1155MarketplaceInstance.nonMinted1155Sells(0);

      expect(
        await clone1
          .connect(approvedContract)
          .callStatic.balanceOf(addr2.address, sell.tokenId)
      ).to.equal(10);
      expect(sell.sellData.status).to.equal(1);
      expect(Number(newBuyerBalance)).to.equal(
        Number(Math.Big(oldBuyerBalance).sub(totalPayment))
      );
      expect(Number(newTreasury1155)).to.equal(
        Number(Math.Big(oldTreasury1155).add(Math.Big(totalPay)))
      );
      expect(Number(oldRoyaltyBalance)).to.equal(
        Number(Math.Big(newRoyaltyBalance))
      );

      expect(Number(newSystemBalance)).to.equal(
        Number(Math.Big(oldSystemBalance).add(systemPortion))
      );
    });

    it("should not allow to buy non minted erc1155 token when sale has expired", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate =
        (await time.latest()) + (await Helper.convertToSeconds("weeks", 1));
      const listedAmount = 10;
      const sellUnit = 10;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      const elapsedTime = await Helper.convertToSeconds("weeks", 2);

      await network.provider.send("evm_increaseTime", [elapsedTime]);
      await network.provider.send("evm_mine");

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      await expect(
        nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0)
      ).to.be.revertedWith(MarketplaceErrorMsg.SALE_HAS_EXPIRED);
    });

    it("should not allow to buy non minted erc1155 token when status of listed NFTs is not be valid", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await nonMinted1155MarketplaceInstance.connect(admin).cancelSell(0);

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      await expect(
        nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.INVALID_STATUS_TO_SELL);
    });

    it("should set debt to buy non minted erc1155 token when user has not sufficient balance-0", async function () {
      const price = ethers.utils.parseUnits("10");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const tokenId = 0;

      //const royaltyPercentage = 1000;
      //const systemFee = await landRockerInstance.systemFee();
      const treasury1155 = await landRockerInstance.treasury1155();

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

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

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      //before buy
      const oldBuyerBalance = await lrtInstance.balanceOf(addr2.address);
      const oldTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const oldSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      const tx = await nonMinted1155MarketplaceInstance
        .connect(addr2)
        .buyItem(0);

      const newBuyerBalance = await lrtInstance.balanceOf(addr2.address);
      const newTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const newSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      let totalPayment = 0;
      const discountAmount = price
        .mul(1000)
        .div(ethers.BigNumber.from("10000"));

      if (discountAmount > cap) {
        totalPayment = price.sub(cap);
      } else {
        totalPayment = price.sub(discountAmount);
      }

      await expect(tx)
        .to.emit(nonMinted1155MarketplaceInstance, "AssetBought1155WithVesting")
        .withArgs(0, addr2.address, 0, sellUnit, price, totalPayment);

      const sell = await nonMinted1155MarketplaceInstance.nonMinted1155Sells(0);

      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);

      expect(
        await clone1
          .connect(approvedContract)
          .callStatic.balanceOf(addr2.address, sell.tokenId)
      ).to.equal(10);
      expect(sell.sellData.status).to.equal(1);
      expect(Number(newBuyerBalance)).to.equal(
        Number(Math.Big(oldBuyerBalance))
      );
      expect(Number(newTreasury1155)).to.equal(
        Number(Math.Big(oldTreasury1155))
      );
      expect(Number(newSystemBalance)).to.equal(
        Number(Math.Big(oldSystemBalance))
      );

      const vestingStat = await lrtVestingInstance.holdersStat(addr2.address);
      expect(vestingStat.claimedAmount).to.equal(totalPayment);

      await expect(tx)
        .to.emit(lrtVestingInstance, "DebtCreated")
        .withArgs(totalPayment, addr2.address);
    });

    it("should set debt to buy non minted erc1155 token when user has not sufficient balance", async function () {
      const price = ethers.utils.parseUnits("20");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const royaltyPercentage = 200;
      const systemFee = await landRockerInstance.systemFee();
      const treasury1155 = await landRockerInstance.treasury1155();
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("5"));

      /////////////////////////////////////Create vesting plans/////////////////////////////////////////////////////
      // set up the vesting plan No.1 parameters
      const startDate1 =
        (await time.latest()) + (await Helper.convertToSeconds("days", 1));
      const cliff1 = await Helper.convertToSeconds("days", 1); // 1 day cliff86400;
      const duration1 = await Helper.convertToSeconds("weeks", 1); // 1 week vesting period
      const revocable1 = true;
      const poolName1 = ethers.utils.formatBytes32String("Sale");
      const initialReleasePercentage1 = 5000;

      // create the vesting plan No.1
      const txVestingPlan1 = await lrtVestingInstance
        .connect(admin)
        .createVestingPlan(
          startDate1,
          cliff1,
          duration1,
          revocable1,
          initialReleasePercentage1,
          poolName1
        );

      // set up the vesting plan No.2 parameters
      const startDate2 =
        (await time.latest()) + (await Helper.convertToSeconds("days", 1));
      const cliff2 = await Helper.convertToSeconds("days", 1); // 1 day cliff86400;
      const duration2 = await Helper.convertToSeconds("weeks", 1); // 1 week vesting period
      const revocable2 = true;
      const poolName2 = ethers.utils.formatBytes32String("Game");
      const initialReleasePercentage2 = 5000;

      // create the vesting plan No.2
      const txVestingPlan2 = await lrtVestingInstance
        .connect(admin)
        .createVestingPlan(
          startDate2,
          cliff2,
          duration2,
          revocable2,
          initialReleasePercentage2,
          poolName2
        );

      // set up the vesting plan No.3 parameters
      const startDate3 =
        (await time.latest()) + (await Helper.convertToSeconds("days", 1));
      const cliff3 = await Helper.convertToSeconds("days", 1); // 1 day cliff86400;
      const duration3 = await Helper.convertToSeconds("weeks", 1); // 1 week vesting period
      const revocable3 = true;
      const poolName3 = ethers.utils.formatBytes32String("Sale");
      const initialReleasePercentage3 = 5000;

      // create the vesting plan No.3
      const txVestingPlan = await lrtVestingInstance
        .connect(admin)
        .createVestingPlan(
          startDate3,
          cliff3,
          duration3,
          revocable3,
          initialReleasePercentage3,
          poolName3
        );
      ///////////////////////////////////Create user vestings//////////////////////////////////////////////////////
      //create vesting schedules No.1 for addr2
      const vestingAmount1 = ethers.utils.parseUnits("10");
      const planId1 = 0;

      const vestingStartDate1 =
        (await time.latest()) + (await Helper.convertToSeconds("days", 2)); // Start date 1 day from now
      await lrtVestingInstance
        .connect(admin)
        .createVesting(
          addr2.address,
          vestingStartDate1,
          vestingAmount1,
          planId1
        );

      //create vesting schedules No.2 for addr2
      const vestingAmount2 = ethers.utils.parseUnits("20");
      const planId2 = 1;

      const vestingStartDate2 =
        (await time.latest()) + (await Helper.convertToSeconds("days", 2)); // Start date 1 day from now
      await lrtVestingInstance
        .connect(admin)
        .createVesting(
          addr2.address,
          vestingStartDate2,
          vestingAmount2,
          planId2
        );

      //create vesting schedules No.3 for addr2
      const vestingAmount3 = ethers.utils.parseUnits("30");
      const planId3 = 2;

      const vestingStartDate3 =
        (await time.latest()) + (await Helper.convertToSeconds("days", 2)); // Start date 1 day from now
      await lrtVestingInstance
        .connect(admin)
        .createVesting(
          addr2.address,
          vestingStartDate3,
          vestingAmount3,
          planId3
        );
      ///////////////////////////////////////////////////////////////////////////////////////
      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      //before buy
      const oldBuyerBalance = await lrtInstance.balanceOf(addr2.address);
      const oldTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const oldSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      const oldRoyaltyBalance = await lrtInstance.balanceOf(
        royaltyRecipient.address
      );

      let totalPayment = 0;
      const discountAmount = Math.Big(discountPercentage).mul(price).div(10000);

      if (Number(discountAmount) > Number(cap)) {
        totalPayment = Math.Big(price).sub(cap);
      } else {
        totalPayment = Math.Big(price).sub(discountAmount);
      }

      const tx = await nonMinted1155MarketplaceInstance
        .connect(addr2)
        .buyItem(0);

      const newBuyerBalance = await lrtInstance.balanceOf(addr2.address);
      const newTreasury1155 = await lrtInstance.balanceOf(treasury1155);
      const newSystemBalance = await lrtInstance.balanceOf(
        nonMinted1155MarketplaceInstance.address
      );

      const newRoyaltyBalance = await lrtInstance.balanceOf(
        royaltyRecipient.address
      );

      let systemPortion = Math.Big(systemFee).mul(totalPayment).div(10000);
      let totalPay = Math.Big(totalPayment).sub(systemPortion);
      let royaltyAmount = Math.Big(totalPay).mul(royaltyPercentage).div(10000);

      await expect(tx)
        .to.emit(nonMinted1155MarketplaceInstance, "AssetBought1155WithVesting")
        .withArgs(
          0,
          addr2.address,
          0,
          sellUnit,
          price,
          ethers.utils.parseUnits("18")
        );

      const sell = await nonMinted1155MarketplaceInstance.nonMinted1155Sells(0);

      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(collection_one);

      expect(
        await clone1
          .connect(approvedContract)
          .callStatic.balanceOf(addr2.address, sell.tokenId)
      ).to.equal(10);
      expect(sell.sellData.status).to.equal(1);
      expect(Number(newBuyerBalance)).to.equal(
        Number(Math.Big(oldBuyerBalance))
      );
      expect(Number(newTreasury1155)).to.equal(
        Number(Math.Big(oldTreasury1155))
      );
      ////////////////////////////////////////////////////
      expect(Number(newRoyaltyBalance)).to.equal(
        Number(Math.Big(oldRoyaltyBalance))
      );

      expect(Number(newSystemBalance)).to.equal(
        Number(Math.Big(oldSystemBalance))
      );
      const vestingStat = await lrtVestingInstance.holdersStat(addr2.address);
      expect(Number(vestingStat.claimedAmount)).to.equal(
        Number(Math.Big(totalPayment))
      );

      await expect(tx)
        .to.emit(lrtVestingInstance, "DebtCreated")
        .withArgs(totalPayment.toString(), addr2.address);
    });

    it("should not allow to buy non minted erc1155 token when sellUnit+soldAmount is greater than listedAmount", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const treasury1155 = await landRockerInstance.treasury1155();
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      const tx = await nonMinted1155MarketplaceInstance
        .connect(addr2)
        .buyItem(0);

      const sell = await nonMinted1155MarketplaceInstance.nonMinted1155Sells(0);

      await expect(
        nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.EXCEED_SELL);
    });

    it("should not allow to buy non minted erc1155 token when has allowance error", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, 0);

      await expect(
        nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0)
      ).to.be.revertedWith(MarketplaceErrorMsg.ALLOWANCE);
    });

    it("should not allow to buy non minted erc1155 token when collection is not active", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      await landRockerInstance
        .connect(admin)
        .setLandRockerCollection1155(collection_one, false);

      await expect(
        nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.COLLECTION_NOT_ACTIVE);
    });

    it("should not allow to buy non minted erc1155 token when has not sufficient vesting balance", async function () {
      const price = ethers.utils.parseUnits("10");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("5"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      await expect(
        nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.INSUFFICIENT_VESTED_BALANCE);
    });
  });

  describe("test canceling a sell", function () {
    beforeEach(async function () {
      const tx = await nonMinted1155MarketplaceInstance
        .connect(script)
        .setUserDiscount(addr2.address, 1000, discountExpireDate, 5, cap);
    });
    it("should not allow to cancel non minted erc1155 token when the sell does not exist", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      await nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0);

      await expect(
        nonMinted1155MarketplaceInstance.connect(admin).cancelSell(0)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.ACTIVE_ORDER);
    });

    it("should allow to cancel non minted erc1155 token", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      const tx = await nonMinted1155MarketplaceInstance
        .connect(admin)
        .cancelSell(0);

      await expect(tx)
        .to.emit(nonMinted1155MarketplaceInstance, "SellCanceled")
        .withArgs(0);

      const sell = await nonMinted1155MarketplaceInstance.nonMinted1155Sells(0);

      // Check that the sell has the correct details
      expect(sell.sellData.status).to.equal(2);
    });

    it("should not allow to cancel non minted erc1155 token when the sell order is active", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      await nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0);

      await expect(
        nonMinted1155MarketplaceInstance.connect(admin).cancelSell(0)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.ACTIVE_ORDER);
    });

    it("should not allow to cancel sell dose not exist", async function () {
      await expect(
        nonMinted1155MarketplaceInstance.connect(admin).cancelSell(0)
      ).to.be.revertedWith(NonMinted1155ErrorMsg.INVALID_SELL);
    });

    it("should not allow to cancel non minted erc1155 token when the caller is not admin", async function () {
      const price = ethers.utils.parseUnits("1");
      const floorPrice = ethers.utils.parseUnits("1");
      const expireDate = 0;
      const listedAmount = 10;
      const sellUnit = 10;
      const tokenId = 0;

      await nonMinted1155MarketplaceInstance
        .connect(admin)
        .createSell(
          price,
          collection_one,
          expireDate,
          listedAmount,
          sellUnit,
          tokenId
        );

      await lrtInstance
        .connect(distributor)
        .transferToken(addr2.address, ethers.utils.parseUnits("500"));

      await lrtInstance
        .connect(addr2)
        .approve(nonMinted1155MarketplaceInstance.address, price);

      await nonMinted1155MarketplaceInstance.connect(addr2).buyItem(0);

      await expect(
        nonMinted1155MarketplaceInstance.connect(addr1).cancelSell(0)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });
  });



  // Upgradeability testing
  // describe("Contract Version 2 test", function () {
  //   let oldContract, upgradedContract, owner, addr1;
  //   beforeEach(async function () {
  //     const NonMinted1155Marketplace = await ethers.getContractFactory(
  //       "NonMinted1155Marketplace"
  //     );
  //     const NonMinted1155MarketplaceUpgraded = await ethers.getContractFactory(
  //       "NonMinted1155MarketplaceUpgraded"
  //     );
  //     oldContract = await upgrades.deployProxy(
  //       NonMinted1155Marketplace,
  //       [
  //         arInstance.address,
  //         lrtInstance.address,
  //         landRockerInstance.address,
  //         lrtVestingInstance.address,
  //         nft1155PoolInstance.address,
  //       ],
  //       { initializer: "initializeNonMinted1155Marketplace", kind: "uups" }
  //     );

  //     await oldContract.deployed();
  //     upgradedContract = await upgrades.upgradeProxy(
  //       oldContract,
  //       NonMinted1155MarketplaceUpgraded,
  //       {
  //         call: {
  //           fn: "initializeNonMinted1155Marketplace",
  //           args: [
  //             arInstance.address,
  //             lrtInstance.address,
  //             landRockerInstance.address,
  //             lrtVestingInstance.address,
  //             nft1155PoolInstance.address,
  //             "hi i am upgraded",
  //           ],
  //         },
  //       }
  //     );
  //   });

  //   it("Old contract should return old greeting", async function () {
  //     expect(await upgradedContract.greeting()).to.equal("hi i am upgraded");
  //   });

  //   it("Old contract cannot mint NFTs", async function () {
  //     try {
  //       oldContract.greetingNew();
  //     } catch (error) {
  //       expect(error.message === "oldContract.greetingNew is not a function");
  //     }
  //   });

  //   it("New Contract Should return the old & new greeting and token name after deployment", async function () {
  //     expect(await upgradedContract.greeting()).to.equal("hi i am upgraded");
  //   });
  // });
});
