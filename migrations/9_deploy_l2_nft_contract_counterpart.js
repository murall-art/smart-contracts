var MurAllNFTL2 = artifacts.require('./l2/MurAllNFTL2.sol')

const MINTABLE_ERC721_PREDICATE_PROXY_GOERLI = '0x56E14C4C1748a818a5564D33cF774c59EB3eDF59'
const MINTABLE_ERC721_PREDICATE_PROXY_ETHEREUM = '0x932532aA4c0174b8453839A6E44eE09Cc615F2b7'

module.exports = async function (deployer, network, accounts) {
    const predicateProxyAddress =
        network == 'mainnet' ? MINTABLE_ERC721_PREDICATE_PROXY_ETHEREUM : MINTABLE_ERC721_PREDICATE_PROXY_GOERLI

    await deployer.deploy(MurAllNFTL2, predicateProxyAddress, [
        '0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC',
        '0x9388517B36B817DCCbb663a3097f4c5fFDBeCC14',
        '0xF7A3bBe1711Eb43967cdbf58FA61342a25E3c845'
    ])
}
