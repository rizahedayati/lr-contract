const hre = require("hardhat");
const { ethers } = require("hardhat");

async function deploy_lrtFuelStaking(arInstance, lrtInstance) {
  //deploy LRTFuelStaking
  const LRTFuelStaking = await ethers.getContractFactory("LRTFuelStaking");
  const lrtFuelStakingInstance = await upgrades.deployProxy(
    LRTFuelStaking,
    [arInstance.address, lrtInstance.address],
    {
      kind: "uups",
      initializer: "initializeFuelStake",
    }
  );

  await lrtFuelStakingInstance.deployed();

  return lrtFuelStakingInstance;
}
module.exports = deploy_lrtFuelStaking;
