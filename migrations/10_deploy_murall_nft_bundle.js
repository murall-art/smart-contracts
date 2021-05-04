var MurAllNFT = artifacts.require('./MurAllNFT.sol')
var NFTBundle = artifacts.require('./bundle/NFTBundle.sol')

module.exports = async function (deployer, network, accounts) {
    await deployer.deploy(NFTBundle, 'MurAll Bundle', 'BMURALL', MurAllNFT.address, [
        '0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC',
        '0x9388517B36B817DCCbb663a3097f4c5fFDBeCC14',
        '0xF7A3bBe1711Eb43967cdbf58FA61342a25E3c845'
    ])
}
