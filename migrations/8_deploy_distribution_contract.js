var MerkleDistributor = artifacts.require('./distribution/MerkleDistributor.sol')
var Token = artifacts.require('./PaintToken.sol')

module.exports = async function (deployer, network, accounts) {
    const merkleRoot = '0x75984c7647bf9a87f37a6b1d9c8d23dbcc461bc3f1678945ce95aa9138a8cdb2'
    // 18060697031000000000000000000 tokens to transfer
    const totalTokenToTransferIntoDistributor = '0x00000000000000000000000000000000000000003a5b755be1714b7672bc0000'
    await deployer.deploy(MerkleDistributor, Token.address, merkleRoot)

    paintTokenInstance = await Token.deployed()
    MerkleDistributorInstance = await MerkleDistributor.deployed()
    paintTokenInstance.transfer(MerkleDistributorInstance.address, totalTokenToTransferIntoDistributor)
}
