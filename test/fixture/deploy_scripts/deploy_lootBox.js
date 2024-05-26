const hre = require("hardhat");
const { ethers } = require("hardhat");

async function deploy_lootBox(
  arInstance,
  lrtInstance,
  landRockerInstance,
  lrtVestingInstance
) {
  //deploy LootBox
  const LootBox = await ethers.getContractFactory("LootBox");
  const lootBoxInstance = await upgrades.deployProxy(
    LootBox,
    [
      arInstance.address,
      lrtInstance.address,
      landRockerInstance.address,
      lrtVestingInstance.address,
    ],
    {
      kind: "uups",
      initializer: "initializeLootBox",
    }
  );

  await lootBoxInstance.deployed();

  return lootBoxInstance;
}
module.exports = deploy_lootBox;
