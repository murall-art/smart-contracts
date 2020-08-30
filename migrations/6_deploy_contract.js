var MurAll = artifacts.require('./MurAll.sol');
var MurAllNFT = artifacts.require('./MurAllNFT.sol');
var Token = artifacts.require('./PaintToken.sol');

module.exports = async function (deployer) {
    await deployer.deploy(MurAll, Token.address, MurAllNFT.address);
    murAllInstance = await MurAll.deployed();
    murallNftInstance = await MurAllNFT.deployed();
    await murallNftInstance.transferOwnership(murAllInstance.address);
};
