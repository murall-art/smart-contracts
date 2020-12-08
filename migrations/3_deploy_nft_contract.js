var MurAllNFT = artifacts.require('./MurAllNFT.sol');

module.exports = async function (deployer, network, accounts) {
    await deployer.deploy(MurAllNFT, [accounts[0]]);
};
