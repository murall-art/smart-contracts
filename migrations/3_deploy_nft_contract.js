var MurAllNFT = artifacts.require('./MurAllNFT.sol');
var ArtwrkImageDataStorage = artifacts.require('./storage/ArtwrkImageDataStorage.sol');

module.exports = async function (deployer, network, accounts) {
    await deployer.deploy(ArtwrkImageDataStorage);
    artwrkImageDataStorageInstance = await ArtwrkImageDataStorage.deployed();

    await deployer.deploy(MurAllNFT, [accounts[0]], artwrkImageDataStorageInstance.address);
    murallNftInstance = await MurAllNFT.deployed();
    await artwrkImageDataStorageInstance.transferOwnership(murallNftInstance.address);
};
