var GridNFT = artifacts.require('./boringsecuritycollab/GridNFT.sol')
var MintManager = artifacts.require('./distribution/MintManager.sol')
var Token = artifacts.require('./PaintToken.sol')
var web3 = require('web3')
module.exports = async function (deployer, network, accounts) {
    const admins = [
        '0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC',
        '0x9388517B36B817DCCbb663a3097f4c5fFDBeCC14',
        '0xF7A3bBe1711Eb43967cdbf58FA61342a25E3c845'
    ]
    const numInitialMintable = 10
    const numPresaleMintable = 10
    const feePresale = web3.utils.toWei('0.15', 'ether') // 0.15 ETH cost for presale
    const feePublicSale = web3.utils.toWei('0.25', 'ether') // 0.25 ETH cost for public sale
    await deployer.deploy(MintManager, admins, numInitialMintable, numPresaleMintable, feePresale, feePublicSale)

    mintManagerInstance = await MintManager.deployed()

    const paintCostPerPixel = web3.utils.toWei('0.5', 'ether') // 0.5 PAINT cost per pixel
    const gridSize = web3.utils.toBN('192')
    const maxSupply = web3.utils.toBN('69')
    await deployer.deploy(
        GridNFT,
        gridSize,
        paintCostPerPixel,
        maxSupply,
        admins,
        mintManagerInstance.address,
        Token.address
    )

    GridNFTInstance = await GridNFT.deployed()

    await mintManagerInstance.setToken(GridNFTInstance.address)
}
