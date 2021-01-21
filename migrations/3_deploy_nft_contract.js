var MurAllNFT = artifacts.require('./MurAllNFT.sol')
var NftImageDataStorage = artifacts.require('./storage/NftImageDataStorage.sol')

module.exports = async function (deployer, network, accounts) {
    await deployer.deploy(NftImageDataStorage)
    NftImageDataStorageInstance = await NftImageDataStorage.deployed()

    await deployer.deploy(
        MurAllNFT,
        [
            '0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC',
            '0x9388517B36B817DCCbb663a3097f4c5fFDBeCC14',
            '0xF7A3bBe1711Eb43967cdbf58FA61342a25E3c845'
        ],
        NftImageDataStorageInstance.address
    )
    murallNftInstance = await MurAllNFT.deployed()
    await NftImageDataStorageInstance.transferOwnership(murallNftInstance.address)
}
