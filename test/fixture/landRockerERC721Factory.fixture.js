const { ethers } = require("hardhat");

const deploy_access_restriction = require("./deploy_scripts/deploy_access_restriction");
const deploy_landRockerERC721 = require("./deploy_scripts/deploy_landRockerERC721");
const deploy_landRocker = require("./deploy_scripts/deploy_landRocker");
const deploy_landRockerERC721Factory = require("./deploy_scripts/deploy_landRockerERC721Factory");

let ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_ROLE"));

let APPROVED_CONTRACT_ROLE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("APPROVED_CONTRACT_ROLE")
);

let DISTRIBUTOR_ROLE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("DISTRIBUTOR_ROLE")
);

async function landRockerERC721FactoryFixture() {
  const [
    owner,
    admin,
    approvedContract,
    addr1,
    addr2,
    treasury,
    royaltyRecipient,
    factory,
  ] = await ethers.getSigners();

  const arInstance = await deploy_access_restriction(owner);

  await arInstance.grantRole(ADMIN_ROLE, admin.address);
  await arInstance.grantRole(APPROVED_CONTRACT_ROLE, approvedContract.address);

  const landRockerERC721Instance = await deploy_landRockerERC721();

  const landRockerERC721FactoryInstance = await deploy_landRockerERC721Factory(
    arInstance
  );

  return {
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
  };
}

module.exports = {
  landRockerERC721FactoryFixture,
};
