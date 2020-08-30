var MurAllNFT = artifacts.require("./MurAllNFT.sol");

module.exports = async function(deployer) {
  await deployer.deploy(MurAllNFT);
};
