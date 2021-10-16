var MurAllFrame = artifacts.require('./frames/MurAllFrame.sol')

const LINK_TOKEN_RINKEBY = '0x326C977E6efc84E512bB9C30f76E30c160eD06FB'
const LINK_TOKEN_MAINNET = '0xb0897686c545045aFc77CF20eC7A532E3120E0F1'
const VRF_COORDINATOR_RINKEBY = '0x8C7382F9D8f56b33781fE506E897a4F1e2d17255'
const VRF_COORDINATOR_MAINNET = '0x3d2341ADb2D31f1c5530cDC622016af293177AE0'

const KEYHASH_RINKEBY = '0x6e75b569a01ef56d18cab6a8e71e6600d6ce853834d4a5748b720d06f878b3a4'
const KEYHASH_MAINNET = '0xf86195cf7690c55907b2b611ebb7343a6f649bff128701cc542f0569e2c549da'
const FEE_RINKEBY = '100000000000000000' // 0.1 * 10**18 LINK for test chain
const FEE_MAINNET = '2000000000000000000' // 2 * 10**18  LINK cost for Ethereum

module.exports = async function (deployer, network, accounts) {
    const linkTokenAddress = network == 'mainnet' ? LINK_TOKEN_MAINNET : LINK_TOKEN_RINKEBY
    const vrfAddress = network == 'mainnet' ? VRF_COORDINATOR_MAINNET : VRF_COORDINATOR_RINKEBY
    const keyhash = network == 'mainnet' ? KEYHASH_MAINNET : KEYHASH_RINKEBY
    const fee = network == 'mainnet' ? FEE_MAINNET : FEE_RINKEBY

    await deployer.deploy(
        MurAllFrame,
        [
            '0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC',
            '0x9388517B36B817DCCbb663a3097f4c5fFDBeCC14',
            '0xF7A3bBe1711Eb43967cdbf58FA61342a25E3c845'
        ],
        vrfAddress,
        linkTokenAddress,
        keyhash,
        BigInt(fee)
    )

    MurAllFrameInstance = await MurAllFrame.deployed()
}
