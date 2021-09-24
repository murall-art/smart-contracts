var MurAllRolesNFT = artifacts.require('./roles/MurAllRolesNFT.sol')

const MURALL_RINKEBY = '0x0877F939731384FD41eB599EA5Bb3c32b642845f'
const MURALL_MAINNET = '0x6442bDfd16352726AA25Ad6b3CBAb3865c05ED15'
const BASE_URI = 'ipfs://QmQcYjqbfEMz4bTTgCnBm6aEY3DuViqH7sqEyLMfpAd5SS/{id}'

module.exports = async function (deployer, network, accounts) {
    const murAllAddress = network == 'mainnet' ? MURALL_MAINNET : MURALL_RINKEBY

    await deployer.deploy(
        MurAllRolesNFT,
        [
            '0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC',
            '0x9388517B36B817DCCbb663a3097f4c5fFDBeCC14',
            '0xF7A3bBe1711Eb43967cdbf58FA61342a25E3c845'
        ],
        BASE_URI,
        murAllAddress
    )
}
