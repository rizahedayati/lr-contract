const hre = require("hardhat");
const { ethers } = require("hardhat");

async function deploy_lrt_team_vesting_second(lrtDistributorInstance,arInstance) {

  //deploy LRTVesting
  const LRTVestingTeamSecond = await ethers.getContractFactory("LRTVestingTeamSecond");
  const lrtVestingTeamSecondInstance = await LRTVestingTeamSecond.deploy(
    lrtDistributorInstance.address,
    arInstance.address
  );

  await lrtVestingTeamSecondInstance.deployed();

  return lrtVestingTeamSecondInstance;
}
module.exports = deploy_lrt_team_vesting_second;

