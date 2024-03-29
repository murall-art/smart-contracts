var MurAllRolesNFT = artifacts.require('./roles/MurAllRolesNFT.sol')

const MURALL_RINKEBY = '0x0877F939731384FD41eB599EA5Bb3c32b642845f'
const MURALL_MAINNET = '0x6442bDfd16352726AA25Ad6b3CBAb3865c05ED15'
const PAINTER_URI = 'ipfs://QmPZemnaJ7JAvkc1AL3FhBUB7Y3v1aLiEb9yjDqAaKmAqN/1'
const MURALLIST_URI = 'ipfs://QmPZemnaJ7JAvkc1AL3FhBUB7Y3v1aLiEb9yjDqAaKmAqN/2'

module.exports = async function (deployer, network, accounts) {
    const murAllAddress = network == 'mainnet' ? MURALL_MAINNET : MURALL_RINKEBY

    await deployer.deploy(
        MurAllRolesNFT,
        [
            '0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC',
            '0x9388517B36B817DCCbb663a3097f4c5fFDBeCC14',
            '0xF7A3bBe1711Eb43967cdbf58FA61342a25E3c845'
        ],
        PAINTER_URI,
        MURALLIST_URI,
        murAllAddress
    )
}
