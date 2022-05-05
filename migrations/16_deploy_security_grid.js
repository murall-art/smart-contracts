var GridNFT = artifacts.require('./boringsecuritycollab/GridNFT.sol')
var MintManager = artifacts.require('./distribution/MintManager.sol')
var Token = artifacts.require('./PaintToken.sol')

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

    await deployer.deploy(GridNFT, admins, mintManagerInstance.address, Token.address)

    GridNFTInstance = await GridNFT.deployed()

    await mintManagerInstance.setToken(GridNFTInstance.address)
}
