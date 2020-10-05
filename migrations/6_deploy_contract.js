var MurAll = artifacts.require('./MurAll.sol');
var MurAllNFT = artifacts.require('./MurAllNFT.sol');
var Token = artifacts.require('./PaintToken.sol');
var DataValidator = artifacts.require('./validator/MurAllDataValidator.sol');

module.exports = async function (deployer) {
    await deployer.deploy(DataValidator);
    dataValidatorInstance = await DataValidator.deployed();
    await deployer.deploy(MurAll, Token.address, MurAllNFT.address, dataValidatorInstance.address);
    murAllInstance = await MurAll.deployed();
    murallNftInstance = await MurAllNFT.deployed();
    await murallNftInstance.transferOwnership(murAllInstance.address);
};
