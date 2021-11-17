var MurAllFrame = artifacts.require('./frames/MurAllFrame.sol')
var MintManager = artifacts.require('./distribution/MintManager.sol')

const LINK_TOKEN_RINKEBY = '0x01BE23585060835E02B77ef475b0Cc51aA1e0709'
const LINK_TOKEN_MAINNET = '0x514910771AF9Ca656af840dff83E8264EcF986CA'
const VRF_COORDINATOR_RINKEBY = '0xb3dCcb4Cf7a26f6cf6B120Cf5A73875B7BBc655B'
const VRF_COORDINATOR_MAINNET = '0xf0d54349aDdcf704F77AE15b96510dEA15cb7952'

const KEYHASH_RINKEBY = '0x2ed0feb3e7fd2022120aa84fab1945545a9f2ffc9076fd6156fa96eaff4c1311'
const KEYHASH_MAINNET = '0xAA77729D3466CA35AE8D28B3BBAC7CC36A5031EFDC430821C02BC31A238AF445'
const FEE_RINKEBY = '100000000000000000' // 0.1 * 10**18 LINK for test chain
const FEE_MAINNET = '2000000000000000000' // 2 * 10**18  LINK cost for Ethereum

const FEE_PRESALE = '144000000000000000' // 0.144 ETH cost for presale
const FEE_PUBLIC_SALE = '244000000000000000' // 0.244 ETH cost for public sale

module.exports = async function (deployer, network, accounts) {
    const admins = [
        '0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC',
        '0x9388517B36B817DCCbb663a3097f4c5fFDBeCC14',
        '0xF7A3bBe1711Eb43967cdbf58FA61342a25E3c845'
    ]
    await deployer.deploy(MintManager, admins, 436, 1004, BigInt(FEE_PRESALE), BigInt(FEE_PUBLIC_SALE))

    mintManagerInstance = await MintManager.deployed()

    const linkTokenAddress = network == 'mainnet' ? LINK_TOKEN_MAINNET : LINK_TOKEN_RINKEBY
    const vrfAddress = network == 'mainnet' ? VRF_COORDINATOR_MAINNET : VRF_COORDINATOR_RINKEBY
    const keyhash = network == 'mainnet' ? KEYHASH_MAINNET : KEYHASH_RINKEBY
    const fee = network == 'mainnet' ? FEE_MAINNET : FEE_RINKEBY

    await deployer.deploy(
        MurAllFrame,
        admins,
        mintManagerInstance.address,
        vrfAddress,
        linkTokenAddress,
        keyhash,
        BigInt(fee)
    )

    MurAllFrameInstance = await MurAllFrame.deployed()

    await mintManagerInstance.setToken(MurAllFrameInstance.address)
}
