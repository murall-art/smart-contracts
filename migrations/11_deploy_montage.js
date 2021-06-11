var MurAllNFT = artifacts.require('./MurAllNFT.sol')
var MontageNFT = artifacts.require('./montage/MontageNFT.sol')
var MontageDataStorage = artifacts.require('./storage/MontageDataStorage.sol')
var RoyaltyGovernor = artifacts.require('./royalties/RoyaltyGovernor.sol')

module.exports = async function (deployer, network, accounts) {
    await deployer.deploy(MontageDataStorage)
    montageDataStorageInstance = await MontageDataStorage.deployed()

    await deployer.deploy(
        MontageNFT,
        'MurAll Montage ',
        'MONTAGE',
        MurAllNFT.address,
        montageDataStorageInstance.address,
        [
            '0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC',
            '0x9388517B36B817DCCbb663a3097f4c5fFDBeCC14',
            '0xF7A3bBe1711Eb43967cdbf58FA61342a25E3c845'
        ]
    )

    montageNFTInstance = await MontageNFT.deployed()
    await montageDataStorageInstance.transferOwnership(montageNFTInstance.address)
}
