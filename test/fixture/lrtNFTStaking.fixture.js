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
const deploy_lrtNFTStaking = require("./deploy_scripts/deploy_lrtNFTStaking");
const deploy_lrt_distributor = require("./deploy_scripts/deploy_lrt_distributor");
const deploy_landRockerERC1155 = require("./deploy_scripts/deploy_landRockerERC1155");
const deploy_landRockerERC1155Factory = require("./deploy_scripts/deploy_landRockerERC1155Factory");

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

async function lrtNFTStakingFixture() {
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
    royaltyRecipient,
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

  const landRockerInstance = await deploy_landRocker(arInstance);
  const landRockerERC1155Instance = await deploy_landRockerERC1155();
  const lrtNFTStakingInstance = await deploy_lrtNFTStaking(
    arInstance,
    lrtInstance
  );

  await arInstance.grantRole(
    APPROVED_CONTRACT_ROLE,
    lrtNFTStakingInstance.address
  );
  const landRockerERC1155FactoryInstance =
    await deploy_landRockerERC1155Factory(arInstance);

  await landRockerERC1155FactoryInstance
    .connect(admin)
    .setImplementationAddress(landRockerERC1155Instance.address);

  await landRockerERC1155FactoryInstance
    .connect(admin)
    .createLandRockerERC1155(
      "landRocker-nonMinted-1",
      "LR1155-nonMinted-1",
      royaltyRecipient.address,
      200,
      "https://srvs20.landrocker.io/game_service/bc/get/uniq/token/data?token_id="
    );
  const collection_one =
    await landRockerERC1155FactoryInstance.landRockerERC1155Clones(0);
  await landRockerInstance
    .connect(admin)
    .setLandRockerCollection1155(collection_one, true);

  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  // await lrtNFTStakingInstance.connect(admin).setDurations(1, true);
  // await lrtNFTStakingInstance.connect(admin).setDurations(3, true);
  // await lrtNFTStakingInstance.connect(admin).setDurations(6, true);
  // await lrtNFTStakingInstance.connect(admin).setDurations(9, true);
  // await lrtNFTStakingInstance.connect(admin).setDurations(12, true);

  // await lrtNFTStakingInstance.connect(admin).setAPR(1, 1500);
  // await lrtNFTStakingInstance.connect(admin).setAPR(3, 1250);
  // await lrtNFTStakingInstance.connect(admin).setAPR(6, 1075);
  // await lrtNFTStakingInstance.connect(admin).setAPR(9, 937);
  // await lrtNFTStakingInstance.connect(admin).setAPR(12, 750);

  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(0, ethers.utils.parseUnits("10000"), 20);
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(1, ethers.utils.parseUnits("47692"), 20);
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(2, ethers.utils.parseUnits("85385"), 20);
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(3, ethers.utils.parseUnits("123077"), 10);
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(4, ethers.utils.parseUnits("160769"), 10);
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(5, ethers.utils.parseUnits("198462"), 10);
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(6, ethers.utils.parseUnits("236154"), 10);
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(7, ethers.utils.parseUnits("273846"), 10);
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(8, ethers.utils.parseUnits("311538"), 10);
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(9, ethers.utils.parseUnits("349231"), 10);
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(10, ethers.utils.parseUnits("386923"), 10);
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(11, ethers.utils.parseUnits("424615"), 10);
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(12, ethers.utils.parseUnits("462308"), 10);
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setRewardToken(13, ethers.utils.parseUnits("500000"), 10);

  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setStakeCapacity(ethers.utils.parseUnits("300000000"));
  // await lrtNFTStakingInstance
  //   .connect(admin)
  //   .setThreshold(ethers.utils.parseUnits("10000"));

  // const startDate = Number(await Helper.timeInitial(TimeEnumes.weeks, 5));
  // await lrtNFTStakingInstance.connect(admin).setDurationLimit(1718905289);
  /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
  await lrtNFTStakingInstance.connect(admin).setDurations(1, true);
  await lrtNFTStakingInstance.connect(admin).setDurations(3, true);
  await lrtNFTStakingInstance.connect(admin).setDurations(6, true);
  await lrtNFTStakingInstance.connect(admin).setDurations(9, true);
  await lrtNFTStakingInstance.connect(admin).setDurations(12, true);

  await lrtNFTStakingInstance
    .connect(admin)
    .setStakeCapacity(ethers.utils.parseUnits("600"));
  await lrtNFTStakingInstance
    .connect(admin)
    .setThreshold(ethers.utils.parseUnits("10"));
  await lrtNFTStakingInstance
    .connect(admin)
    .setDurationLimit(
      (await time.latest()) + (await Helper.convertToSeconds("months", 15))
    );

  await lrtNFTStakingInstance
    .connect(admin)
    .setRewardCollection(collection_one);

  await lrtNFTStakingInstance
    .connect(admin)
    .setRewardToken(0, ethers.utils.parseUnits("2"), 1);

  await lrtNFTStakingInstance
    .connect(admin)
    .setRewardToken(1, ethers.utils.parseUnits("7"), 5);

  await lrtNFTStakingInstance
    .connect(admin)
    .setRewardToken(2, ethers.utils.parseUnits("10"), 0);

  await arInstance.grantRole(DISTRIBUTOR_ROLE, lrtDistributorInstance.address);

  return {
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
  };
}

module.exports = {
  lrtNFTStakingFixture,
};
