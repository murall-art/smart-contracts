var MurAllNFT = artifacts.require('./MurAllNFT.sol');
var NftImageDataStorage = artifacts.require('./storage/NftImageDataStorage.sol');

module.exports = async function (deployer, network, accounts) {
    await deployer.deploy(NftImageDataStorage);
    NftImageDataStorageInstance = await NftImageDataStorage.deployed();

    await deployer.deploy(MurAllNFT, [accounts[0]], NftImageDataStorageInstance.address);
    murallNftInstance = await MurAllNFT.deployed();
    await NftImageDataStorageInstance.transferOwnership(murallNftInstance.address);
};
