var MurAllNFT = artifacts.require('./MurAllNFT.sol')
var NftMetadata = artifacts.require('./NftMetadata.sol')

module.exports = async function (deployer) {
    await deployer.deploy(NftMetadata, MurAllNFT.address)
}
