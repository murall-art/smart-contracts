var MurAllMarketplace = artifacts.require('./MurAllMarketplace.sol');
var MurAllBlockList = artifacts.require('./MurAllBlockList.sol');

module.exports = async function (deployer) {
    await deployer.deploy(MurAllMarketplace, MurAllBlockList.address);
    murAllBlockListInstance = await MurAllBlockList.deployed();
    murallMarketplaceInstance = await MurAllMarketplace.deployed();
    await murAllBlockListInstance.transferOwnership(murallMarketplaceInstance.address);
};
