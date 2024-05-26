const hre = require("hardhat");
const { ethers } = require("hardhat");

async function deploy_lrtNFTStaking(arInstance, lrtInstance) {
  //deploy LRTNFTStaking
  const LRTNFTStaking = await ethers.getContractFactory("LRTNFTStaking");
  const lrtNFTStakingInstance = await upgrades.deployProxy(
    LRTNFTStaking,
    [arInstance.address, lrtInstance.address],
    {
      kind: "uups",
      initializer: "initializeNFTStake",
    }
  );

  await lrtNFTStakingInstance.deployed();

  return lrtNFTStakingInstance;
}
module.exports = deploy_lrtNFTStaking;
