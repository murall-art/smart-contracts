var MurAllNFTL2 = artifacts.require('./l2/MurAllNFTL2.sol')

const ROOT_CHAIN_MANAGER_PROXY_MATIC = '0xA0c68C638235ee32657e8f720a23ceC1bFc77C77'

module.exports = async function (deployer, network, accounts) {
    await deployer.deploy(MurAllNFTL2, ROOT_CHAIN_MANAGER_PROXY_MATIC, [
        '0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC',
        '0x9388517B36B817DCCbb663a3097f4c5fFDBeCC14',
        '0xF7A3bBe1711Eb43967cdbf58FA61342a25E3c845'
    ])
}
