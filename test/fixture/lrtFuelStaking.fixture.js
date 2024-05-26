const { ethers } = require("hardhat");
const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-network-helpers");
const Helper = require("./../helper");

const deploy_access_restriction = require("./deploy_scripts/deploy_access_restriction");
const deploy_lrt = require("./deploy_scripts/deploy_lrt");
const deploy_landRocker = require("./deploy_scripts/deploy_landRocker");
const { lrtDistributorFixture } = require("./lrtDistributor.fixture");
const deploy_lrtVesting = require("./deploy_scripts/deploy_lrt_vesting");
const deploy_assetMarketplace = require("./deploy_scripts/deploy_assetMarketplace");
const deploy_lrtFuelStaking = require("./deploy_scripts/deploy_lrtFuelStaking");
const deploy_lrt_distributor = require("./deploy_scripts/deploy_lrt_distributor");

let ADMIN_ROLE = ethers.utils.keccak256(ethers.utils.toUtf8Bytes("ADMIN_ROLE"));
let APPROVED_CONTRACT_ROLE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("APPROVED_CONTRACT_ROLE")
);
let SCRIPT_ROLE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("SCRIPT_ROLE")
);
let DISTRIBUTOR_ROLE = ethers.utils.keccak256(
  ethers.utils.toUtf8Bytes("DISTRIBUTOR_ROLE")
);

async function lrtFuelStakingFixture() {
  const [
    owner,
    admin,
    distributor,
    approvedContract,
    script,
    addr1,
    addr2,
    addr3,
    treasury,
  ] = await ethers.getSigners();

  const arInstance = await deploy_access_restriction(owner);

  await arInstance.grantRole(ADMIN_ROLE, admin.address);
  await arInstance.grantRole(APPROVED_CONTRACT_ROLE, approvedContract.address);
  await arInstance.grantRole(SCRIPT_ROLE, script.address);
  await arInstance.grantRole(DISTRIBUTOR_ROLE, distributor.address);

  const lrtInstance = await deploy_lrt(arInstance);
  const lrtDistributorInstance = await deploy_lrt_distributor(
    arInstance,
    lrtInstance
  );
  const lrtFuelStakingInstance = await deploy_lrtFuelStaking(
    arInstance,
    lrtInstance
  );

  await lrtFuelStakingInstance.connect(admin).setDurations(1, true);
  await lrtFuelStakingInstance.connect(admin).setDurations(3, true);
  await lrtFuelStakingInstance.connect(admin).setDurations(6, true);
  await lrtFuelStakingInstance.connect(admin).setDurations(9, true);
  await lrtFuelStakingInstance.connect(admin).setDurations(12, true);

  await lrtFuelStakingInstance
    .connect(admin)
    .setStakeCapacity(ethers.utils.parseUnits("600"));
  await lrtFuelStakingInstance
    .connect(admin)
    .setThreshold(ethers.utils.parseUnits("10"));
  await lrtFuelStakingInstance
    .connect(admin)
    .setDurationLimit(
      (await time.latest()) + (await Helper.convertToSeconds("months", 15))
    );

  await arInstance.grantRole(DISTRIBUTOR_ROLE, lrtDistributorInstance.address);
  return {
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
  };
}

module.exports = {
  lrtFuelStakingFixture,
};
