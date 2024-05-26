const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const {
  landRockerERC721FactoryFixture,
} = require("./fixture/landRockerERC721Factory.fixture");
const { AccessErrorMsg, LRFactory721Message } = require("./messages");

const zeroAddress = "0x0000000000000000000000000000000000000000";

let category = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("MARKETPLACE_721")
);

describe("LandRockerERC721Factory", function () {
  let landRockerERC721Instance,
  landRockerERC721FactoryInstance,
  owner,
  admin,
  approvedContract,
  addr1,
  addr2,
  treasury,
  royaltyRecipient,
  factory;

  beforeEach(async function () {
    ({
      landRockerERC721Instance,
      landRockerERC721FactoryInstance,
      owner,
      admin,
      approvedContract,
      addr1,
      addr2,
      treasury,
      royaltyRecipient,
      factory,
    } = await loadFixture(landRockerERC721FactoryFixture));
  });

  describe("create collection", function () {
    it("should create new collection", async () => {
      await landRockerERC721FactoryInstance
        .connect(admin)
        .setImplementationAddress(landRockerERC721Instance.address);

      const tx = await landRockerERC721FactoryInstance
        .connect(admin)
        .createLandRockerERC721(
          "landRocker-one2",
          "LR721-one2",
          royaltyRecipient.address,
          200,
          "https://srvs20.landrocker.io/game_service/bc/get/uniq/token/data?token_id="
        );

      const landRockerERC721Instance1 = await landRockerERC721FactoryInstance
        .connect(admin).
        landRockerERC721Clones(0);

      await expect(tx)
        .to.emit(landRockerERC721FactoryInstance, "LandRockerERC721Created")
        .withArgs(
          landRockerERC721Instance1,
          "landRocker-one2",
          "LR721-one2",
          "https://srvs20.landrocker.io/game_service/bc/get/uniq/token/data?token_id="
        );

      const cloneContract = await ethers.getContractFactory(
        "LandRockerERC721"
      );
      const clone1 = cloneContract.attach(landRockerERC721Instance1);

      expect(await clone1.name()).to.equal("landRocker-one2");
    });

    it("should not allowed to create new collection when implementation address has not been set before", async () => {
      await expect(
        landRockerERC721FactoryInstance
          .connect(admin)
          .createLandRockerERC721(
            "landRocker-one1",
            "LR721-one1",
            royaltyRecipient.address,
            200,
            "https://srvs20.landrocker.io/game_service/bc/get/uniq/token/data?token_id="
          )
      ).to.be.revertedWith(LRFactory721Message.COLLECTION_DOSE_NOT_EXIST);
    });

    it("should not allowed to create new collection when collection is duplicate", async () => {

      await landRockerERC721FactoryInstance
        .connect(admin)
        .setImplementationAddress(landRockerERC721Instance.address);

      await landRockerERC721FactoryInstance
        .connect(admin)
        .createLandRockerERC721(
          "landRocker-one1",
          "LR721-one1",
          royaltyRecipient.address,
          200,
          "https://srvs20.landrocker.io/game_service/bc/get/uniq/token/data?token_id="
        );
      await expect(
        landRockerERC721FactoryInstance
          .connect(admin)
          .createLandRockerERC721(
            "landRocker-one1",
            "LR721-one1",
            royaltyRecipient.address,
            200,
            "https://srvs20.landrocker.io/game_service/bc/get/uniq/token/data?token_id="
          )
      ).to.be.revertedWith(LRFactory721Message.DUPLICATE_COLLECTION);
    });

    it("should not allowed to create new collection when caller is not admin", async () => {
      await expect(
        landRockerERC721FactoryInstance
          .connect(owner)
          .createLandRockerERC721(
            "landRocker-one1",
            "LR721-one1",
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
        landRockerERC721FactoryInstance
          .connect(owner)
          .setImplementationAddress(landRockerERC721Instance.address)
      ).to.be.revertedWith(AccessErrorMsg.CALLER_NOT_ADMIN);
    });

    it("should revert set Implementation address when address is zero", async function () {
      await expect(
        landRockerERC721FactoryInstance
          .connect(admin)
          .setImplementationAddress(zeroAddress)
      ).to.be.revertedWith(LRFactory721Message.INVALID_ADDRESS);
    });

    it("should set implementations address", async function () {
      const tx = await landRockerERC721FactoryInstance
        .connect(admin)
        .setImplementationAddress(landRockerERC721Instance.address);

      await expect(tx)
        .to.emit(
          landRockerERC721FactoryInstance,
          "UpdateImplementationAddress"
        )
        .withArgs(landRockerERC721Instance.address);

      expect(
        await landRockerERC721FactoryInstance.implementationAddress()
      ).equal(landRockerERC721Instance.address);
    });
  });
});

