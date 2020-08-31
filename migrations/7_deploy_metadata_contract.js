var MurAllNFT = artifacts.require('./MurAllNFT.sol');
var ArtwrkMetadata = artifacts.require('./ArtwrkMetadata.sol');

module.exports = async function (deployer) {
    await deployer.deploy(ArtwrkMetadata, MurAllNFT.address);
};
