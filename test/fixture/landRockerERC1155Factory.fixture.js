const { ethers } = require("hardhat");

const deploy_access_restriction = require("./deploy_scripts/deploy_access_restriction");
const deploy_landRockerERC1155 = require("./deploy_scripts/deploy_landRockerERC1155");
const deploy_lrt = require("./deploy_scripts/deploy_lrt");
const deploy_landRocker = require("./deploy_scripts/deploy_landRocker");
const deploy_lrt_distributor = require("./deploy_scripts/deploy_lrt_distributor");
const deploy_lrt_vesting = require("./deploy_scripts/deploy_lrt_vesting");
const deploy_nonMinted1155Marketplace = require("./deploy_scripts/deploy_nonMinted1155Marketplace");
const deploy_landRockerERC1155Factory = require("./deploy_scripts/deploy_landRockerERC1155Factory");

let ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_ROLE"));

let APPROVED_CONTRACT_ROLE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("APPROVED_CONTRACT_ROLE")
);

let DISTRIBUTOR_ROLE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("DISTRIBUTOR_ROLE")
);


async function landRockerERC1155FactoryFixture() {
  const [
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
  ] = await ethers.getSigners();

  const arInstance = await deploy_access_restriction(owner);

  await arInstance.grantRole(ADMIN_ROLE, admin.address);
  await arInstance.grantRole(APPROVED_CONTRACT_ROLE, approvedContract.address);
  await arInstance.grantRole(DISTRIBUTOR_ROLE, distributor.address);

  const landRockerERC1155Instance = await deploy_landRockerERC1155();

  const landRockerERC1155FactoryInstance =
    await deploy_landRockerERC1155Factory(arInstance);

  return {
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
    factory
  };
}

module.exports = {
  landRockerERC1155FactoryFixture,
};
