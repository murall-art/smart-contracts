var GridNFT = artifacts.require('./boringsecuritycollab/GridNFT.sol')
var MintManager = artifacts.require('./distribution/MintManager.sol')
var Token = artifacts.require('./PaintToken.sol')
var web3 = require('web3')
module.exports = async function (deployer, network, accounts) {
    const admins = ['0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC', '0x52C45Bab6d0827F44a973899666D9Cd18Fd90bCF']

    const majorShareAddress = '0x2e8E95DBEb137a24469e711079Ad483D081166F7' // Boring Security Gnosis safe
    const minorShareAddress = '0xCF90AD693aCe601b5B5582C4F95eC7266CDB3eEC' // MurAll deployer
    const numInitialMintable = 11
    const numPresaleMintable = 0
    const feePresale = web3.utils.toWei('0.15', 'ether') // 0.15 ETH cost for presale
    const feePublicSale = web3.utils.toWei('2.69', 'ether') // 2.69 ETH cost for public sale
    await deployer.deploy(MintManager, admins, numInitialMintable, numPresaleMintable, feePresale, feePublicSale)

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
        majorShareAddress,
        minorShareAddress,
        mintManagerInstance.address,
        Token.address
    )

    GridNFTInstance = await GridNFT.deployed()

    await mintManagerInstance.setToken(GridNFTInstance.address)
    const allowTokenAddress =
        network == 'mainnet'
            ? '0x0164fb48891b891e748244b8ae931f2318b0c25b'
            : '0xb6680de3ebeea78518f638a7499f57055a297b4f'
    const allowTokenId = network == 'mainnet' ? 101 : 1
    await GridNFTInstance.setAllowToken(allowTokenAddress, allowTokenId)
    const receipt = await GridNFTInstance.mintInitial(numInitialMintable)
    // print gas used
    console.log('Gas used: ', receipt.receipt.gasUsed)
    console.log('Receipt: ', receipt.receipt)

    if (network == 'rinkeby') {
        mintManagerInstance.setMintingMode(2) //set public minting mode
    }
}
