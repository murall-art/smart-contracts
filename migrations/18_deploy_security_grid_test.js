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
    const financeAdmin = '0xEE213cdf2F7443a70AD824E781f9B3A1aC9ed7Eb'
    const numInitialMintable = 11
    const numPresaleMintable = 0
    const feePresale = web3.utils.toWei('0.15', 'ether') // 0.15 ETH cost for presale
    const feePublicSale = web3.utils.toWei('0.25', 'ether') // 0.25 ETH cost for public sale
    await deployer.deploy(
        MintManager,
        admins,
        numInitialMintable,
        numPresaleMintable,
        feePresale,
        feePublicSale
    )

    mintManagerInstance = await MintManager.deployed()

    const paintCostPerPixel = web3.utils.toWei('1', 'ether') // 1 PAINT cost per pixel
    const gridSize = web3.utils.toBN('160')
    const maxSupply = web3.utils.toBN('70')
    await deployer.deploy(
        GridNFT,
        gridSize,
        paintCostPerPixel,
        maxSupply,
        admins,
        financeAdmin,
        mintManagerInstance.address,
        Token.address
    )

    GridNFTInstance = await GridNFT.deployed()

    await mintManagerInstance.setToken(GridNFTInstance.address)
    const allowTokenAddress =
        network == 'mainnet'
            ? '0x0164fb48891b891e748244b8ae931f2318b0c25b'
            : '0xA57e9717a44F794A1e1cC35f2D2D503794AA8c09'
    const allowTokenId = network == 'mainnet' ? 101 : 1
    await GridNFTInstance.setAllowToken(allowTokenAddress, allowTokenId)
    if (network == 'goerli') {
        await GridNFTInstance.mintInitial(numInitialMintable)
        mintManagerInstance.setMintingMode(2) //set public minting mode
    }
}
