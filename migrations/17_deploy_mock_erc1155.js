var MockERC1155 = artifacts.require('./mock/MockERC1155.sol')

module.exports = async function (deployer, network, accounts) {
    await deployer.deploy(MockERC1155, 'Test Grid')
}
