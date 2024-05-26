

const { expect } = require("chai");
const { ethers } = require("hardhat");

const {
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");

const {
  landRockerERC1155FactoryFixture,
} = require("./fixture/landRockerERC1155Factory.fixture");
const { AccessErrorMsg, LRFactory1155Message } = require("./messages");

const zeroAddress = "0x0000000000000000000000000000000000000000";

let category = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("MARKETPLACE_1155")
);

describe("LandRockerERC1155Factory", function () {
  let landRockerERC1155FactoryInstance,
    landRockerERC1155Instance,
    owner,
    admin,
    distributor,
    approvedContract,
    script,
    addr1,
    addr2,
    treasury,
    royaltyRecipient,
    factory;

  beforeEach(async function () {
    ({
      landRockerERC1155FactoryInstance,
      landRockerERC1155Instance,
      owner,
      admin,
      distributor,
      approvedContract,
      script,
      addr1,
      addr2,
      treasury,
      royaltyRecipient,
      factory,
    } = await loadFixture(landRockerERC1155FactoryFixture));
  });

  describe("create collection", function () {
    it("should create new collection", async () => {
      await landRockerERC1155FactoryInstance
        .connect(admin)
        .setImplementationAddress(landRockerERC1155Instance.address);

      const tx = await landRockerERC1155FactoryInstance
        .connect(admin)
        .createLandRockerERC1155(
          "landRocker-one2",
          "LR1155-one2",
          royaltyRecipient.address,
          200,
          "https://srvs20.landrocker.io/game_service/bc/get/uniq/token/data?token_id="
        );

      const landRockerERC1155Instance1 = await landRockerERC1155FactoryInstance
        .connect(admin)
        .landRockerERC1155Clones(0);

      await expect(tx)
        .to.emit(landRockerERC1155FactoryInstance, "LandRockerERC1155Created")
        .withArgs(
          landRockerERC1155Instance1,
          "landRocker-one2",
          "LR1155-one2",
          "https://srvs20.landrocker.io/game_service/bc/get/uniq/token/data?token_id="
        );

      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC1155"
      );
      const clone1 = cloneContract.attach(landRockerERC1155Instance1);

      expect(await clone1.name()).to.equal("landRocker-one2");
    });

    it("should not allowed to create new collection when implementation address has not been set before", async () => {
      await expect(
        landRockerERC1155FactoryInstance
          .connect(admin)
          .createLandRockerERC1155(
            "landRocker-one1",
            "LR1155-one1",
            royaltyRecipient.address,
            200,
            "https://srvs20.landrocker.io/game_service/bc/get/uniq/token/data?token_id="
          )
      ).to.be.revertedWith(LRFactory1155Message.COLLECTION_DOSE_NOT_EXIST);
    });

    it("should not allowed to create new collection when collection is duplicate", async () => {
      await landRockerERC1155FactoryInstance
        .connect(admin)
        .setImplementationAddress(landRockerERC1155Instance.address);

      await landRockerERC1155FactoryInstance
        .connect(admin)
        .createLandRockerERC1155(
          "landRocker-one1",
          "LR1155-one1",
          royaltyRecipient.address,
          200,
          "https://srvs20.landrocker.io/game_service/bc/get/uniq/token/data?token_id="
        );
      await expect(
        landRockerERC1155FactoryInstance
          .connect(admin)
          .createLandRockerERC1155(
            "landRocker-one1",
            "LR1155-one1",
            royaltyRecipient.address,
            200,
            "https://srvs20.landrocker.io/game_service/bc/get/uniq/token/data?token_id="
          )
      ).to.be.revertedWith(LRFactory1155Message.DUPLICATE_COLLECTION);
    });

    it("should not allowed to create new collection when caller is not admin", async () => {
      await expect(
        landRockerERC1155FactoryInstance
          .connect(owner)
          .createLandRockerERC1155(
            "landRocker-one1",
            "LR1155-one1",
            royaltyRecipient.address,
            200,
            "https://srvs20.landrocker.io/game_service/bc/get/uniq/token/data?token_id="
          )
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });
  });

  describe("set implementation test", function () {
    it("should revert set Implementation address when caller is not admin", async function () {
      await expect(
        landRockerERC1155FactoryInstance
          .connect(owner)
          .setImplementationAddress(landRockerERC1155Instance.address)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should revert set Implementation address when address is zero", async function () {
      await expect(
        landRockerERC1155FactoryInstance
          .connect(admin)
          .setImplementationAddress(zeroAddress)
      ).to.be.revertedWith(LRFactory1155Message.INVALID_ADDRESS);
    });

    it("should set implementations address", async function () {
      const tx = await landRockerERC1155FactoryInstance
        .connect(admin)
        .setImplementationAddress(landRockerERC1155Instance.address);

      await expect(tx)
        .to.emit(
          landRockerERC1155FactoryInstance,
          "UpdateImplementationAddress"
        )
        .withArgs(landRockerERC1155Instance.address);

      expect(
        await landRockerERC1155FactoryInstance.implementationAddress()
      ).equal(landRockerERC1155Instance.address);
    });
  });
});
