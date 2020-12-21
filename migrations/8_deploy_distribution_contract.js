var MerkleDistributor = artifacts.require('./distribution/MerkleDistributor.sol');
var Token = artifacts.require('./PaintToken.sol');

module.exports = async function (deployer) {
    const merkleRoot = '0xba29e8379d37df7225c311ba90176eb9d2e6de1f79e9b5ff115cf93cef63f818';
    await deployer.deploy(MerkleDistributor, Token.address, merkleRoot);
};
